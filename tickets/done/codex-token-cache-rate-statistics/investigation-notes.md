# Investigation Notes

- Ticket: `codex-token-cache-rate-statistics`
- Last Updated: `2026-06-28`

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Deep investigation and fresh live runtime probes are complete for the original 99%+ Codex cache-rate suspicion, the Codex output/thinking undercount question, and the follow-up Claude Agent SDK comparison. The original Codex cache-hit value is valid provider-reported prompt-cache behavior. The confirmed Codex bug is backend accounting collapse: Autobyteus receives multiple Codex `thread/tokenUsage/updated` notifications during a multi-call/tool-heavy turn, yet same-turn updates can overwrite one another in pending storage before persistence. Live Claude Agent SDK probing did not reproduce that same problem: Claude emitted one terminal `result` usage payload, one websocket `TOKEN_USAGE_UPDATED`, and one ledger row per app turn, including an SDK internal tool-loop turn with `num_turns=3`.
- Investigation Goal: Determine whether Codex Token Meter cache-hit statistics are incorrectly computed/aggregated, reproduce or falsify the suspected 99%+ cache-rate behavior with realistic Codex app-server experiments, identify whether token usage events are captured and accounted exactly once, compare Claude Agent SDK accounting for similar failure modes, and define the correct backend/frontend solution direction.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: Crosses Codex provider usage capture, Claude Agent SDK terminal-result usage capture, turn lifecycle buffering, token/pricing normalization, persisted/live run data, frontend Token Meter projection, and live runtime probing. The cache-rate math itself does not need correction, but the Codex ingestion path needs a mandatory accounting fix plus small UI copy/label clarity. Claude does not need a Codex-style cumulative-delta fix based on current live evidence, but Claude `usage` vs `modelUsage` divergence remains a diagnostic/source-selection risk.
- Scope Summary: Investigate suspicious 99.8% Codex cache-hit display, verify Codex prompt-cache behavior through live probes, diagnose why Codex output/thinking tokens can appear too small, compare Claude Agent SDK token accounting with live terminal-result/tool-loop probes, and document the required exactly-once accounting model for Codex usage updates.
- Primary Questions To Resolve:
  - Which code path captures Codex provider usage token fields? Answer: `resolveCodexThreadTokenUsage` reads Codex app-server `thread/tokenUsage/updated` params and currently selects `tokenUsage.last` when present. The normalized usage object preserves `raw_usage_json` from the selected `last` object and `raw_event_json` containing `{ threadId, turnId, tokenUsage: { total, last, modelContextWindow } }`.
  - Which code path computes `gross input`, `uncached/full-price input`, `cache hits/discounted input`, and cache-hit percentage? Answer: `TokenUsageComponentBasisResolver` maps gross/standard/cache buckets; `TokenUsageLedgerStore` and `tokenUsageMeterStore` summarize rates; `cacheSubline` formats `cacheReadInputTokenRate`.
  - Is the screenshot value provider-reported, locally inferred, or an aggregation artifact? Answer: provider-reported in Codex app-server raw `tokenUsage.last` (`inputTokens=208212`, `cachedInputTokens=207744`), with UI math `207744 / 208212 = 99.775%`.
  - Are 99%+ rates plausible in live Codex app-server behavior? Answer: yes. Two fresh live probes reproduced 99.3%-99.9% cache rates immediately after a long stable prompt prefix was reused with short deltas.
  - Did we react to every Codex token event? Answer: we do react to `thread/tokenUsage/updated`; live monkey-patch probes saw every update reach `CodexThread.recordTurnTokenUsage`. The miss is not transport-level.
  - Did we account every Codex token event/increment? Answer: no. Current code stores pending usage by `turnId`, so multiple updates during one active turn can overwrite earlier `tokenUsage.last` payloads before idle/completion. Live gpt-5.5 probe confirmed 4 record calls but only 2 ledger/websocket usage events.
  - Are `outputTokens` and `reasoningOutputTokens` cumulative too? Answer: yes inside `tokenUsage.total`. Probe pairs showed `current tokenUsage.total - previous tokenUsage.total = tokenUsage.last` for `inputTokens`, `cachedInputTokens`, `outputTokens`, `reasoningOutputTokens`, and `totalTokens`.
  - How should absent or provider-unsupported cache data be represented? Existing `cache_state` handles positive/zero/not-reported/unsupported/unknown; no defect found for the positive Codex case.
  - How does the app normalize provider-specific data? Answer: runtime adapters emit normalized `TOKEN_USAGE_UPDATED` payloads, then `TokenUsageEventEnrichmentTransformer` applies shared context enrichment, component-basis resolution, cumulative-snapshot delta normalization, cost calculation, and async ledger persistence. Frontend displays the server-normalized summary.
  - Does Claude Agent SDK have the same same-turn overwrite/cumulative-vs-last bug? Answer: no evidence from live probes. Claude usage is terminal-result based; a live three-turn probe with one SDK internal tool-loop turn produced exactly three usage-bearing result chunks, three websocket usage messages, and three ledger rows.
  - Does Claude have any separate accounting risk? Answer: yes. Local production rows show `result.modelUsage` can be higher than `result.usage`, while the current mapper prefers `usage`; live controlled probes did not reproduce the divergence, so this is a diagnostic/source-authority risk rather than the confirmed Codex overwrite bug.

## Request Context

User observed the Codex app server Token Meter showing `Gross input` 208,212 tokens, `Cache hit 99.8%`, `Uncached / full-price input` 468 tokens, and `Cache hits / discounted input` 207,744 tokens. The user believed 99%+ was too high and suspected a Codex token statistics bug related to KV/prompt cache accounting. Follow-up questions asked whether high cache rates rise in long conversations, why compaction did not make the displayed ratio drop immediately, why thinking tokens seemed too small, whether Autobyteus missed token events, and whether `CodexThread.recordTurnTokenUsage` captures all returned usage data.

Reference images:

- Original screenshot: `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_287a570b6a5f489eb3ae9dca6e6e2839/solution_designer_2d750c923326405c9b1550ed16499af4/context_files/ctx_b555aaeed000__image.png`
- Follow-up screenshot: `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_287a570b6a5f489eb3ae9dca6e6e2839/solution_designer_2d750c923326405c9b1550ed16499af4/context_files/ctx_04850b5f8ba1__image.png`

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-token-cache-rate-statistics`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-token-cache-rate-statistics/tickets/in-progress/codex-token-cache-rate-statistics`
- Current Branch: `codex/codex-token-cache-rate-statistics`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-token-cache-rate-statistics`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin` succeeded on 2026-06-27 before worktree creation.
- Task Branch: `codex/codex-token-cache-rate-statistics` at `f3305f40`, tracking `origin/personal`.
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None.
- Notes For Downstream Agents: Original shared checkout `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` is on `personal` and has unrelated untracked files; authoritative work is isolated in this task worktree.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-06-27 | Command | `pwd; ls -la` in `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` | Resolve initial workspace. | Root is superrepo checkout with Autobyteus packages. | No |
| 2026-06-27 | Command | `git status --short --branch; git remote -v; git worktree list --porcelain; git remote show origin` | Bootstrap repo state and base branch. | Initial checkout on `personal`; remote HEAD `personal`; many existing codex worktrees; no exact worktree for this task. | No |
| 2026-06-27 | Command | `git fetch origin` | Refresh tracked remote before branch creation. | Fetch succeeded. | No |
| 2026-06-27 | Setup | `git worktree add -b codex/codex-token-cache-rate-statistics /Users/normy/autobyteus_org/autobyteus-worktrees/codex-token-cache-rate-statistics origin/personal` | Create mandatory dedicated task worktree. | Worktree created at `f3305f40`, branch tracking `origin/personal`. | No |
| 2026-06-27 | Other | User-supplied original screenshot image path | Capture observed symptom. | Token Meter shows `Gross input 208.212`, `Cache hit 99.8%`, `Uncached 468 tok`, `Cache hits 207.744 tok`, `Output 331`, total estimate 208.543 tokens. | No |
| 2026-06-27 | Code | `sed -n '1,220p' autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-token-usage.ts` | Inspect Codex token usage mapping. | `tokenUsage.last` is preferred, `cachedInputTokens` maps to `cache_read_input_tokens`, and raw event/usage JSON is preserved. | Needs fix for total-delta accounting. |
| 2026-06-27 | Code | `sed -n '1,300p' autobyteus-server-ts/src/token-usage/projections/token-usage-component-basis-resolver.ts` | Inspect canonical component derivation. | For `gross_includes_cache`, standard input is `reportedInput - cacheRead - cacheCreation`. | No |
| 2026-06-27 | Code | `sed -n '1,360p' autobyteus-server-ts/src/token-usage/providers/token-usage-ledger-store.ts` | Inspect summary aggregation/rate math. | Summary sums component fields and computes `cache_read_input_token_rate` as cached/gross. | No |
| 2026-06-27 | Code | `sed -n '1,260p' autobyteus-web/components/workspace/usage/TokenUsageMeterPanel.vue`; `sed -n '1,260p' autobyteus-web/components/workspace/usage/tokenUsageFormatting.ts` | Inspect UI cache-hit rendering. | UI formats `cacheReadInputTokenRate` when cache state is positive; it does not infer cache hits. | UX label clarity recommended. |
| 2026-06-27 | Data | `sqlite3 /Users/normy/.autobyteus/server-data/db/production.db ... WHERE accounting_input_tokens=208212 OR cache_read_input_tokens=207744 OR standard_input_tokens=468` | Find screenshot-matching persisted event. | Exact row found with raw Codex `inputTokens=208212`, `cachedInputTokens=207744`, `outputTokens=331`. | No |
| 2026-06-27 | Data | `sqlite3 /Users/normy/.autobyteus/server-data/db/production.db ... WHERE run_id='delivery_engineer_c992d76532c6433c978e6495af2d58d1'` | Inspect all events for the matching run. | Four persisted events all have high raw Codex cache rates; the screenshot row is one `per_turn` event. | No |
| 2026-06-27 | Data | Python sqlite sample of latest 200 `runtime_kind='codex_app_server'` ledger rows | Check whether 99%+ is isolated. | 87/200 recent events are >=99%, 149/200 >=95%, and every sampled cached-token count is divisible by 128. | No |
| 2026-06-27 | Data | `tickets/done/token-input-prompt-discrepancy-analysis/experiment-evidence/2026-06-25T17-33-27-472Z-codex-runtime-two-round.json` | Reuse prior controlled Codex runtime probe. | Probe raw usage confirms `tokenUsage.last.inputTokens` gross and `cachedInputTokens` subset. | No |
| 2026-06-27 | Doc | `tickets/done/token-input-prompt-discrepancy-analysis/provider-probe-matrix.md` | Reuse prior provider semantics synthesis. | Matrix records Codex App Server as confirmed `gross_includes_cache`; `tokenUsage.total` cumulative. | No |
| 2026-06-27 | Data | `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-token-cache-rate-statistics/tickets/in-progress/codex-token-cache-rate-statistics/current-codex-cache-rate-probe.json` | Durable probe report for this investigation. | Captures matching row, all matching run events, recent distribution, and conclusion. | No |
| 2026-06-27 | Setup | `pnpm install --frozen-lockfile` in task worktree | Prepare dependencies needed for live Codex app-server E2E probes. | Install succeeded; dependency state local to task worktree. | No |
| 2026-06-27 | Setup | `pnpm -C autobyteus-server-ts exec prisma generate --schema ./prisma/schema.prisma` | Generate Prisma client needed by server E2E tests. | Prisma generation succeeded. | No |
| 2026-06-27 | Test | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/codex-cache-rate-live-probe.e2e.test.ts --reporter=verbose` | Run fresh live Codex app-server cache-rate probe using a long stable prefix and turn deltas. | Passed. Model `gpt-5.4-mini`; warmup cache `4.3%`; repeated-prefix turns `99.9%`; large novel suffix turn `84.8%`; recovery turn `99.9%`. Evidence file `experiment-evidence/2026-06-27T16-15-33-657Z-codex-cache-rate-live-probe.json`. | No |
| 2026-06-27 | Test | `CODEX_E2E_TOOL_MODEL=gpt-5.5 CODEX_CACHE_RATE_PROBE_INSTRUCTION_LINES=900 CODEX_CACHE_RATE_PROBE_NOVEL_SUFFIX_LINES=220 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/codex-cache-rate-live-probe.e2e.test.ts --reporter=verbose` | Repeat the live probe with the screenshot model family and a smaller but still long stable prefix. | Passed. Model `gpt-5.5`; warmup cache `8.2%`; repeated-prefix turns `99.3%`; large novel suffix turn `85.5%`; recovery turn `99.8%`. Evidence file `experiment-evidence/2026-06-27T16-16-36-489Z-codex-cache-rate-live-probe.json`. | No |
| 2026-06-27 | Data | `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-token-cache-rate-statistics/tickets/in-progress/codex-token-cache-rate-statistics/live-codex-cache-rate-experiment-summary.json` | Durable synthesis of the fresh live cache-rate probe evidence. | Confirms screenshot-like 99%+ rates are realistic provider prompt-cache behavior under repeated long-prefix turns. | No |
| 2026-06-27 | Code | `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-token-cache-rate-statistics/tickets/in-progress/codex-token-cache-rate-statistics/scripts/codex-cache-rate-live-probe.e2e.test.ts` | Preserve the probe script used for the live Codex experiments. | Script creates a temporary Codex app-server run, captures raw `TOKEN_USAGE_UPDATED` events, writes evidence JSON, and cleans up temp DB run events/workspaces. | No |
| 2026-06-28 | Other/Data | User-supplied follow-up screenshot and local DB query for `run_id=solution_designer_f2b4e2caca934cedbc658ff7a95bfb0b` | Explain compaction boundary, current prompt, cumulative cache rate, and thinking token display. | Screenshot run totals (`470430` input, `465664` cached, `1301` output, `494` reasoning) exactly equal two persisted rows. Later row shows current prompt dropped to `39781` after compaction. | UI label clarity recommended. |
| 2026-06-28 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-notification-handler.ts`; `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread.ts` | Inspect whether token events are received and how `recordTurnTokenUsage` buffers them. | Handler calls `recordTurnTokenUsage`; `recordTurnTokenUsage` stores usage in `pendingTurnTokenUsage: Map<turnId, usage>`, allowing later same-turn updates to overwrite earlier pending updates. | Fix required. |
| 2026-06-28 | Test | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/codex-token-accounting-live-probe.e2e.test.ts --reporter=verbose` | Run fresh live gpt-5.5 Codex probe with monkey patch on `CodexThread.recordTurnTokenUsage` to verify whether intra-turn token usage updates are received and persisted exactly once. | Passed. Confirmed run recorded 4 `recordTurnTokenUsage` calls but only 2 ledger/websocket usage events. Three calls belonged to the same tool-heavy turn; later calls had `hadPendingBefore=true`, proving overwrite before persistence. Evidence file `experiment-evidence/2026-06-28T03-57-58-441Z-codex-token-accounting-live-probe.json`. | Fix required. |
| 2026-06-28 | Test | `CODEX_TOKEN_ACCOUNTING_CAPTURE_FULL_USAGE=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/codex-token-accounting-live-probe.e2e.test.ts --reporter=verbose` | Capture the full normalized usage object for each `recordTurnTokenUsage` call. | Full capture shows normalized usage contains `raw_usage_json` from selected `last`, and `raw_event_json` contains both `tokenUsage.total` and `tokenUsage.last`. Evidence file `experiment-evidence/2026-06-28T04-05-58-694Z-codex-token-accounting-live-probe.json`. | Use total+last in design. |
| 2026-06-28 | Data | `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-token-cache-rate-statistics/tickets/in-progress/codex-token-cache-rate-statistics/live-codex-token-accounting-experiment-summary.json` | Durable synthesis of the live accounting probe. | Confirms Autobyteus reacts to Codex tokenUsage notifications but current pending-by-turn storage collapses multiple intra-turn updates into one accounted event. | Fix required. |
| 2026-06-28 | Data | `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-token-cache-rate-statistics/tickets/in-progress/codex-token-cache-rate-statistics/codex-total-vs-last-relationship-report.json` | Determine relationship between Codex `tokenUsage.total` and `tokenUsage.last`. | Across 7 comparable consecutive captured update pairs, total deltas matched `last` for input, cached input, output, reasoning, and total tokens with 0 mismatches. | Use cumulative-delta accounting. |
| 2026-06-28 | Data | `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-token-cache-rate-statistics/tickets/in-progress/codex-token-cache-rate-statistics/codex-total-vs-last-production-sample.json` | Compare persisted production rows to cumulative totals. | Many persisted row-to-row deltas are larger than persisted `last`, indicating skipped/collapsed intermediate updates. Rows without collapsed updates match exactly, including reasoning examples. | Supports fix and regression tests. |
| 2026-06-28 | Code | `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-token-cache-rate-statistics/tickets/in-progress/codex-token-cache-rate-statistics/scripts/codex-token-accounting-live-probe.e2e.test.ts` | Preserve the live accounting probe script. | Script patches `recordTurnTokenUsage`, runs a baseline and a tool-heavy turn, captures record calls, websocket messages, ledger rows, full usage object when enabled, and writes evidence JSON. | No |

| 2026-06-28 | Code | `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-token-usage.ts`; `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session.ts`; `autobyteus-server-ts/src/agent-execution/backends/claude/events/claude-session-event-converter.ts` | Inspect Claude Agent SDK token ingestion. | Claude emits token usage only from terminal `type=result` SDK chunks; assistant/thinking/tool chunks are not usage rows; converter maps `session/tokenUsageUpdated` to normalized `TOKEN_USAGE_UPDATED`. | No Codex-style pending overwrite path found. |
| 2026-06-28 | Code | `autobyteus-server-ts/src/agent-execution/events/processors/token-usage/token-usage-event-enrichment-transformer.ts`; `autobyteus-server-ts/src/token-usage/projections/token-usage-component-basis-resolver.ts`; `autobyteus-server-ts/src/token-usage/projections/token-usage-snapshot-delta-normalizer.ts` | Explain shared runtime-neutral normalization pipeline. | Runtime adapters normalize provider fields first; shared pipeline creates canonical payload, enriches context, resolves gross/standard/cache buckets, delta-normalizes cumulative snapshots, prices, then persists. | No |
| 2026-06-28 | Test | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/claude-token-accounting-live-probe.e2e.test.ts --reporter=verbose` | Run live Claude Agent SDK accounting probe with raw SDK chunk logging and two direct turns. | Passed. Evidence `experiment-evidence/2026-06-28T05-44-29-779Z-claude-token-accounting-live-probe.json`: 61 raw chunks, 2 terminal result chunks, 2 usage-bearing chunks, 2 websocket usage messages, 2 ledger rows. | No same-turn overwrite seen. |
| 2026-06-28 | Test | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/claude-token-accounting-live-probe.e2e.test.ts --reporter=verbose` after adding a Bash-forcing prompt | Run live Claude Agent SDK probe through an internal SDK tool loop. | Passed. Evidence `experiment-evidence/2026-06-28T05-46-24-053Z-claude-token-accounting-live-probe.json`: 153 raw chunks, 3 terminal result chunks, 3 usage-bearing chunks, 3 websocket usage messages, 3 ledger rows. The tool-loop result had `num_turns=3` but still only one terminal usage event. | Preserve as primary Claude comparison evidence. |
| 2026-06-28 | Data | `claude-modelusage-production-sample.json` from `/Users/normy/.autobyteus/server-data/db/production.db` | Check whether Claude `result.usage` and `result.modelUsage` always agree. | Sample found 2 Claude rows; both preserved `modelUsage`; both had modelUsage totals higher than raw `usage` (`+1133 input/+88 output`, `+444 input/+427 output`). | Diagnostic/source-selection risk; not same as Codex overwrite. |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: Token Meter tab in Autobyteus desktop/web UI for an active Codex provider run.
- Current execution flow:
  1. Codex app server emits `thread/tokenUsage/updated` with `{ threadId, turnId, tokenUsage: { total, last, modelContextWindow } }`.
  2. `handleAppServerNotification` receives the notification, resolves usage via `resolveCodexThreadTokenUsage`, and calls `codexThread.recordTurnTokenUsage(turnId, usage)`.
  3. `resolveCodexThreadTokenUsage` selects `tokenUsage.last` as `per_turn` usage when present and maps `inputTokens`, `cachedInputTokens`, `outputTokens`, and `reasoningOutputTokens` into server token usage fields; it keeps the full params payload in `raw_event_json`.
  4. `CodexThread.recordTurnTokenUsage` stores the usage in `pendingTurnTokenUsage: Map<string, usage>` keyed only by `turnId`; if the turn is active, dispatch waits until idle/completion.
  5. When a later usage update arrives for the same active `turnId`, `pendingTurnTokenUsage.set(turnId, usage)` overwrites the earlier pending update.
  6. `TokenUsageEventEnrichmentTransformer` runs `TokenUsageComponentBasisResolver`, `TokenUsageSnapshotDeltaNormalizer`, and `TokenCostCalculator` for the surviving usage event before dispatch/persistence.
  7. `TokenUsageLedgerStore` and live `tokenUsageMeterStore` expose summaries with `cache_read_input_token_rate = cache_read_input_tokens / gross_input_tokens`.
  8. `TokenUsageMeterPanel` renders cache hit/output/thinking/cost from server/live summaries.
- Ownership or boundary observations: Codex raw usage parsing and provider-specific reconciliation should stay backend-owned by the Codex runtime/token-usage ingestion path. Component-bucket semantics and cost remain server projection responsibilities. The frontend should remain presentation-only and should not perform provider-specific delta accounting.
- Current behavior summary: The high cache-hit display is real provider prompt-cache reuse, not fabricated UI math. The actual defect is that same-turn Codex usage increments are not guaranteed to reach ledger/UI because pending usage is keyed only by `turnId`.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug fix plus small UX clarity improvement.
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Local implementation defect plus missing invariant. The correct owner exists, but it does not enforce the invariant that every provider usage increment is accounted exactly once.
- Refactor posture evidence summary: Refactor needed in Codex token usage ingestion/buffering. The UI and generic cache-rate formula do not need provider-specific accounting logic. Frontend label/tooltips should be improved so run totals and latest prompt/context metrics are not confused after compaction.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| Original screenshot + DB row | 468 uncached + 207,744 cached = 208,212 gross, yielding 99.8%; raw Codex `last` supplied these numbers. | The displayed cache math is internally consistent; source classification is provider-reported. | Do not “fix” high rates by changing formula. |
| Fresh cache probes | Repeated long stable-prefix turns produced 99.3%-99.9% cache rates; novel suffix turns dropped to ~85%; next short turns recovered. | 99%+ is plausible prompt-cache behavior when nearly the full prefix is stable. | No cache formula fix. |
| Follow-up screenshot + DB rows | Run cards sum persisted rows, while `Current prompt` is latest prompt snapshot; compaction affects current prompt on next provider usage but does not reset cumulative run totals. | UI labels need clearer distinction between run totals and latest/current prompt. | UX copy/tooltip update recommended. |
| Live accounting probe | 4 `recordTurnTokenUsage` calls but only 2 persisted/websocket usage events; three same-turn updates collapsed to the final one. | Mandatory backend accounting fix. | Implement exactly-once usage update/delta accounting. |
| Total-vs-last relationship report | 7/7 comparable update pairs matched `total_delta == last` for all token fields, including reasoning. | `tokenUsage.total` can be authoritative snapshot series; `last` can serve first-baseline and validation. | Use in design and tests. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-notification-handler.ts` | Codex app-server notification handling | Receives `thread/tokenUsage/updated`, resolves usage, and calls `recordTurnTokenUsage`. | Transport/event receipt is present; issue is after receipt. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-token-usage.ts` | Codex runtime token usage mapping | Selects `tokenUsage.last`, maps `cachedInputTokens` to `cache_read_input_tokens`, preserves raw `tokenUsage.total` inside `raw_event_json`. | Correct owner for provider payload parsing; needs total-delta reconciliation support. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread.ts` | Codex thread lifecycle and pending turn usage dispatch | `pendingTurnTokenUsage: Map<turnId, usage>` overwrites earlier same-turn updates while active. | Primary local defect; do not buffer provider accounting by turn id as a single value. |
| `autobyteus-server-ts/src/token-usage/projections/token-usage-component-basis-resolver.ts` | Canonical component derivation | For `gross_includes_cache`, standard input is `reportedInput - cacheRead - cacheCreation`. Screenshot row yields `468 = 208212 - 207744`. | Formula matches provider semantics and should remain. |
| `autobyteus-server-ts/src/token-usage/providers/token-usage-ledger-store.ts` | Historical summary aggregation | Computes `cache_read_input_token_rate = cacheReadTokens / grossInputTokens`; sums output/reasoning token events. | Summary will become correct once Codex ingestion emits exactly-once deltas. |
| `autobyteus-web/components/workspace/usage/TokenUsageMeterPanel.vue` | Token Meter display | Renders cumulative summary cards and current prompt card. | Presentation-only; update labels/tooltips if scope includes UX clarity. |
| `autobyteus-web/components/workspace/usage/tokenUsageFormatting.ts` | Token Meter formatting | Displays `Cache hit` when `cacheState === positive`, formatting server/live `cacheReadInputTokenRate`. | No provider-specific accounting should move here. |
| `/Users/normy/.autobyteus/server-data/db/production.db` table `token_usage_ledger_events` | Local persisted evidence | Contains screenshot-matching rows and follow-up rows with raw Codex total/last data. | Confirms lineage and persisted-row collapse symptoms. |
| `tickets/done/token-input-prompt-discrepancy-analysis/experiment-evidence/2026-06-25T17-33-27-472Z-codex-runtime-two-round.json` | Prior controlled Codex runtime probe | Confirmed `tokenUsage.last.inputTokens` gross and `cachedInputTokens` subset; `tokenUsage.total` cumulative. | Supports trusting Codex `cachedInputTokens` as cache-read bucket. |
| `tickets/in-progress/codex-token-cache-rate-statistics/scripts/codex-cache-rate-live-probe.e2e.test.ts` | Live cache-rate probe script artifact | Runs a real Codex app-server agent through warmup, stable-prefix reuse, novel-suffix, and recovery turns. | Provides reproducible experiment method for cache-rate plausibility. |
| `tickets/in-progress/codex-token-cache-rate-statistics/scripts/codex-token-accounting-live-probe.e2e.test.ts` | Live accounting probe script artifact | Monkey-patches `recordTurnTokenUsage` and captures received usage calls versus emitted/persisted rows. | Provides reproducible evidence of overwrite bug. |
| `tickets/in-progress/codex-token-cache-rate-statistics/experiment-evidence/*.json` | Fresh live probe evidence | Contains raw `TOKEN_USAGE_UPDATED` payloads, captured normalized usage, websocket messages, ledger rows, and summaries. | Durable evidence for architecture and implementation review. |

| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session.ts` | Claude SDK query chunk iteration | Calls `emitClaudeTokenUsageEvent` only when `isClaudeTurnTerminalChunk(chunk)` is true. | Claude usage source is terminal-result based, not streaming multi-update. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-token-usage.ts` | Claude terminal result usage extraction | Reads `result.usage`/`modelUsage`, emits `usage_scope: "per_turn"`, marks Anthropic-style input as `base_excludes_cache`, preserves raw result. | Correct owner for Claude source-selection diagnostics. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/events/claude-session-event-converter.ts` | Claude session event to AgentRunEvent conversion | Maps `session/tokenUsageUpdated` directly to `AgentRunEventType.TOKEN_USAGE_UPDATED`. | No pending-by-turn collapse layer like Codex. |
| `autobyteus-server-ts/src/agent-execution/events/processors/token-usage/token-usage-event-enrichment-transformer.ts` | Shared token usage enrichment | Applies canonical payload creation, context enrichment, component basis, cumulative delta, and cost before dispatch/persistence. | Shared normalizer/pipeline boundary. |
| `tickets/in-progress/codex-token-cache-rate-statistics/scripts/claude-token-accounting-live-probe.e2e.test.ts` | Live Claude probe script artifact | Runs real Claude Agent SDK turns, enables raw chunk logging, captures websocket and ledger rows, writes evidence JSON. | Reproducible Claude comparison method. |
| `tickets/in-progress/codex-token-cache-rate-statistics/live-claude-token-accounting-experiment-summary.json` | Live Claude probe summary | Summarizes direct and tool-loop Claude results. | Durable concise evidence. |
| `tickets/in-progress/codex-token-cache-rate-statistics/claude-modelusage-production-sample.json` | Local production Claude sample | Shows production `usage` vs `modelUsage` divergence in the only two sampled rows. | Source-authority follow-up risk. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-06-27 | Data probe | `sqlite3 /Users/normy/.autobyteus/server-data/db/production.db ... WHERE accounting_input_tokens=208212 OR cache_read_input_tokens=207744 OR standard_input_tokens=468` | Exact row found for `delivery_engineer_c992d76532c6433c978e6495af2d58d1`: raw `tokenUsage.last` has `inputTokens=208212`, `cachedInputTokens=207744`, `outputTokens=331`; computed standard input is `468`; rate is `99.775%`. | The Token Meter value is provider-reported, not locally invented. |
| 2026-06-27 | Data probe | `sqlite3 ... WHERE run_id='delivery_engineer_c992d76532c6433c978e6495af2d58d1' ORDER BY observed_at` | Four persisted events for the matching run have cache rates `99.67%`, `99.66%`, `99.78%`, and `98.99%`. | The screenshot row is not a one-off arithmetic anomaly. |
| 2026-06-27 | Data probe | Python sqlite sample of latest 200 Codex ledger rows | 87/200 recent Codex events have cache rate >=99%, 149/200 >=95%, and all 200 cached-token counts are multiples of 128. | Very high cache rates are common in local Codex app-server usage and have provider-cache-like granularity. |
| 2026-06-27 | Artifact review | `tickets/done/token-input-prompt-discrepancy-analysis/experiment-evidence/2026-06-25T17-33-27-472Z-codex-runtime-two-round.json` | Controlled two-turn Codex probe reported warmup `inputTokens=18378`, `cachedInputTokens=4480`; second turn `inputTokens=26469`, `cachedInputTokens=18304`; provider matrix concluded gross semantics. | Existing semantics basis supports current cache bucket formula. |
| 2026-06-27 | Live E2E probe | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/codex-cache-rate-live-probe.e2e.test.ts --reporter=verbose` | Model `gpt-5.4-mini`, stable instruction prefix 1,800 lines, novel suffix 450 lines. Turn cache rates: warmup `4.3%`; repeated-prefix turn 2 `99.9%`; repeated-prefix turn 3 `99.9%`; novel suffix turn `84.8%`; recovery turn `99.9%`. | Directly reproduces screenshot-like high cache rates and shows they drop/recover with prompt-shape changes. |
| 2026-06-27 | Live E2E probe | `CODEX_E2E_TOOL_MODEL=gpt-5.5 CODEX_CACHE_RATE_PROBE_INSTRUCTION_LINES=900 CODEX_CACHE_RATE_PROBE_NOVEL_SUFFIX_LINES=220 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/codex-cache-rate-live-probe.e2e.test.ts --reporter=verbose` | Model `gpt-5.5`, stable instruction prefix 900 lines, novel suffix 220 lines. Turn cache rates: warmup `8.2%`; repeated-prefix turn 2 `99.4%`; repeated-prefix turn 3 `99.3%`; novel suffix turn `85.5%`; recovery turn `99.8%`. | Reproduces 99%+ rates with the screenshot model and confirms the pattern is not model-specific to `gpt-5.4-mini`. |
| 2026-06-28 | Data probe | Query follow-up screenshot run `solution_designer_f2b4e2caca934cedbc658ff7a95bfb0b` in production DB | Two rows sum exactly to screenshot totals: `input=470430`, `cached=465664`, `standard=4766`, `output=1301`, `reasoning=494`. Later row after compaction has `latest_prompt_tokens=39781`. | Token Meter cards are run totals; current prompt is latest provider prompt snapshot; compaction does not reset cumulative cards. |
| 2026-06-28 | Code trace | Inspect `codex-thread-notification-handler.ts`, `codex-thread-token-usage.ts`, and `codex-thread.ts` | Token usage events are handled, but active-turn usage updates are stored in a single pending map slot keyed by `turnId`. | Same-turn provider updates can overwrite before persistence. |
| 2026-06-28 | Live E2E probe | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/codex-token-accounting-live-probe.e2e.test.ts --reporter=verbose` | Confirmed run had `recordTurnTokenUsage` calls `4`, ledger rows `2`, websocket usage messages `2`, overwritten pending calls `2`. Tool-heavy same-turn increments included `input/output = 10546/87`, `10691/87`, final `10836/28`; only final persisted. | Backend undercounts multi-update turns. |
| 2026-06-28 | Live E2E probe | `CODEX_TOKEN_ACCOUNTING_CAPTURE_FULL_USAGE=1 ... codex-token-accounting-live-probe.e2e.test.ts` | Full-capture rerun had same-turn increments `11050/89`, `11200/89`, final `11349/32`; only final persisted/emitted. Full normalized usage contained both `raw_usage_json` from `last` and `raw_event_json.tokenUsage.total/last`. | We captured enough raw data to implement total-delta accounting; current code simply does not use it. |
| 2026-06-28 | Data analysis | `codex-total-vs-last-relationship-report.json` | Across 7 comparable consecutive captured update pairs, `current total - previous total = last` for input, cached input, output, reasoning, and total tokens; 0 mismatches. | Correct accounting source should be cumulative `total` snapshots converted to deltas, with `last` as baseline/validation. |
| 2026-06-28 | Data analysis | `codex-total-vs-last-production-sample.json` | Persisted production rows often have total deltas larger than persisted `last`; some complete rows match exactly, including reasoning examples (`last_reason=516 == delta_reason=516`, etc.). | Production data is consistent with skipped/collapsed intermediate updates, not with a different meaning for `last`. |

| 2026-06-28 | Live E2E probe | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/claude-token-accounting-live-probe.e2e.test.ts --reporter=verbose` | Claude direct-turn probe selected runtime model `sonnet` (SDK actual model `deepseek-v4-flash`). Counts: raw chunks `61`, terminal result chunks `2`, usage-bearing raw chunks `2`, websocket usage messages `2`, ledger rows `2`. `result.usage` equaled `modelUsage` totals for all token fields. | Claude terminal result accounting is 1:1 for direct turns. |
| 2026-06-28 | Live E2E probe | Same command after adding Bash-forcing prompt | Claude tool-loop probe counts: raw chunks `153`, terminal result chunks `3`, usage-bearing raw chunks `3`, websocket usage messages `3`, ledger rows `3`. The tool-loop result had `num_turns=3`, `input_tokens=205`, `cache_read_input_tokens=44800`, `output_tokens=219`; ledger accounting input was `45005 = 205 + 44800`. | Even an internal SDK tool loop emits one terminal usage result, not multiple same-turn usage updates. No Codex-like overwrite issue reproduced. |
| 2026-06-28 | Data probe | `claude-modelusage-production-sample.json` | Local production sample had only 2 Claude rows; both had `result.modelUsage` higher than `result.usage`. Row deltas: `+1133 input/+88 output`, and `+444 input/+427 output`; cache-read matched. | Separate Claude source-selection risk: current code prefers `usage`; preserve/flag divergence before deciding whether `modelUsage` should become authoritative. |

## External / Public Source Findings

- Public API / spec / issue / upstream source: No fresh external source was needed for this local code/data/probe investigation. Prior done-ticket artifacts already recorded Codex app-server/protocol findings, and the current local raw provider events plus live probes were sufficient to trace the screenshot value and identify the internal accounting bug.
- Version / tag / commit / freshness: Current local code on `origin/personal` at `f3305f40`; persisted local events from 2026-06-27 to 2026-06-28; prior Codex probe artifact from 2026-06-25; fresh live probes on 2026-06-27 and 2026-06-28.
- Relevant contract, behavior, or constraint learned: Local Codex app-server events carry `tokenUsage.last` as a per-update increment and `tokenUsage.total` as cumulative thread counters. `cachedInputTokens` is a cache-read subset of gross input. `modelContextWindow` provides effective context window and latest prompt metrics.
- Why it matters: The reported high cache-hit rate is sourced from raw Codex app-server usage, not local inference. The correct accounting fix must use provider cumulative snapshots/deltas, not frontend-side arithmetic guesses.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: Live Codex app-server runtime available through the local Autobyteus server E2E harness; no external mock was used for the fresh probes.
- Required config, feature flags, env vars, or accounts: Existing local Codex app-server configuration. Cache-rate gpt-5.5 probe used `CODEX_E2E_TOOL_MODEL=gpt-5.5`, `CODEX_CACHE_RATE_PROBE_INSTRUCTION_LINES=900`, and `CODEX_CACHE_RATE_PROBE_NOVEL_SUFFIX_LINES=220`. Full accounting capture used `CODEX_TOKEN_ACCOUNTING_CAPTURE_FULL_USAGE=1`.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated worktree creation, `pnpm install --frozen-lockfile`, and Prisma client generation.
- Cleanup notes for temporary investigation-only setup: Temporary E2E test copies under `autobyteus-server-ts/tests/e2e/runtime/` were removed after execution. Preserved artifact scripts are under `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-token-cache-rate-statistics/tickets/in-progress/codex-token-cache-rate-statistics/scripts/`. Each live probe deleted its temporary ledger events and temporary data/workspace directories in test cleanup.
- Rerun note for cache-rate script: From the task worktree, use `pnpm -C autobyteus-server-ts exec vitest run ../tickets/in-progress/codex-token-cache-rate-statistics/scripts/codex-cache-rate-live-probe.e2e.test.ts --reporter=verbose`. This creates another live Codex run and may incur provider usage.
- Rerun note for accounting script: From the task worktree, use `pnpm -C autobyteus-server-ts exec vitest run ../tickets/in-progress/codex-token-cache-rate-statistics/scripts/codex-token-accounting-live-probe.e2e.test.ts --reporter=verbose`; add `CODEX_TOKEN_ACCOUNTING_CAPTURE_FULL_USAGE=1` to capture the full normalized usage object. This creates another live Codex run and may incur provider usage.

## Findings From Code / Docs / Data / Logs

### Code path findings

- `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-token-usage.ts` reads Codex app-server `params.tokenUsage`, prefers `last` over `total`, and treats `last` as `usage_scope: "per_turn"`.
- The inspected current code maps `selected.cachedInputTokens ?? selected.cached_input_tokens` to `cache_read_input_tokens` and marks `cache_state` positive when that value is > 0.
- Full normalized usage capture shows the fields are already present to support a better fix: `raw_event_json` contains the full params object with both cumulative `tokenUsage.total` and incremental `tokenUsage.last`; `raw_usage_json` contains the selected `last` object.
- `codex-thread-notification-handler.ts` handles the token-usage notification and calls `codexThread.recordTurnTokenUsage(turnId, usage)`; the notification path itself is not skipped.
- `CodexThread.recordTurnTokenUsage` stores pending usage as `pendingTurnTokenUsage.set(turnId, usage)`. During active tool-loop turns, this collapses multiple same-turn updates to whichever update arrived last before idle/completion.
- `TokenUsageComponentBasisResolver` derives `standard_input_tokens` by subtracting cache reads from gross input for `gross_includes_cache`; for the original screenshot row, this exactly produces 468 uncached tokens.
- `TokenUsageLedgerStore` and frontend store compute `cache_read_input_token_rate` by division, and the UI only formats it. That formula is not the bug.

### Current database probe findings

- Screenshot-matching row in `/Users/normy/.autobyteus/server-data/db/production.db`, table `token_usage_ledger_events`:
  - `run_id`: `delivery_engineer_c992d76532c6433c978e6495af2d58d1`
  - `observed_at`: `2026-06-27T15:42:08.041Z`
  - `model_identifier`: `gpt-5.5`
  - `raw_usage_json`: `{ "totalTokens": 208543, "inputTokens": 208212, "cachedInputTokens": 207744, "outputTokens": 331, "reasoningOutputTokens": 0 }`
  - `standard_input_tokens`: `468`
  - `cache_read_input_token_rate`: `207744 / 208212 = 0.997752...`
- All four persisted events for that matching delivery run also show very high Codex-reported cache rates: `99.67%`, `99.66%`, `99.78%`, and `98.99%`.
- Recent 200 Codex event sample: min rate `2.83%`, max `99.95%`, mean `88.67%`, with `87` events >=99% and every cached token count divisible by 128.
- Probe report: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-token-cache-rate-statistics/tickets/in-progress/codex-token-cache-rate-statistics/current-codex-cache-rate-probe.json`.

### Fresh live Codex cache-rate experiment findings

- Probe script artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-token-cache-rate-statistics/tickets/in-progress/codex-token-cache-rate-statistics/scripts/codex-cache-rate-live-probe.e2e.test.ts`.
- Evidence files:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-token-cache-rate-statistics/tickets/in-progress/codex-token-cache-rate-statistics/experiment-evidence/2026-06-27T16-15-33-657Z-codex-cache-rate-live-probe.json`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-token-cache-rate-statistics/tickets/in-progress/codex-token-cache-rate-statistics/experiment-evidence/2026-06-27T16-16-36-489Z-codex-cache-rate-live-probe.json`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-token-cache-rate-statistics/tickets/in-progress/codex-token-cache-rate-statistics/live-codex-cache-rate-experiment-summary.json`
- `gpt-5.4-mini` probe results:
  - Turn 1 warmup unique long stable prefix: `inputTokens=103878`, `cachedInputTokens=4480`, `standardInputTokens=99398`, cache rate `4.3%`.
  - Turn 2 same stable prefix plus short delta: `inputTokens=103893`, `cachedInputTokens=103808`, `standardInputTokens=85`, cache rate `99.9%`.
  - Turn 3 same stable prefix plus short delta: `inputTokens=103908`, `cachedInputTokens=103808`, `standardInputTokens=100`, cache rate `99.9%`.
  - Turn 4 large novel user suffix: `inputTokens=122394`, `cachedInputTokens=103808`, `standardInputTokens=18586`, cache rate `84.8%`.
  - Turn 5 short delta after novel suffix: `inputTokens=122409`, `cachedInputTokens=122240`, `standardInputTokens=169`, cache rate `99.9%`.
- `gpt-5.5` probe results:
  - Turn 1 warmup unique long stable prefix: `inputTokens=61176`, `cachedInputTokens=4992`, `standardInputTokens=56184`, cache rate `8.2%`.
  - Turn 2 same stable prefix plus short delta: `inputTokens=61191`, `cachedInputTokens=60800`, `standardInputTokens=391`, cache rate `99.4%`.
  - Turn 3 same stable prefix plus short delta: `inputTokens=61206`, `cachedInputTokens=60800`, `standardInputTokens=406`, cache rate `99.3%`.
  - Turn 4 large novel user suffix: `inputTokens=71142`, `cachedInputTokens=60800`, `standardInputTokens=10342`, cache rate `85.5%`.
  - Turn 5 short delta after novel suffix: `inputTokens=71157`, `cachedInputTokens=71040`, `standardInputTokens=117`, cache rate `99.8%`.
- Interpretation: The experiments are shape-sensitive in exactly the expected way for prefix prompt caching: mostly uncached on first unique prompt, near-total cache reads for repeated stable prefix with tiny new suffix, lower rate when a large new suffix is introduced, then near-total cache reads again after that suffix becomes part of the reusable prefix. This falsifies the hypothesis that 99%+ is impossible and strongly supports the screenshot as real provider cache reuse.

### Follow-up screenshot: compaction boundary, cumulative cache rate, and thinking tokens

- User follow-up screenshot on 2026-06-28 shows `Current prompt 234,630 / 258,400`, run-level `Gross input 470,430`, `Cache hit 99.0%`, `Uncached 4,766`, `Cache hits 465,664`, `Output 1,301`, and `Thinking 494`.
- Local DB row reconstruction for `run_id=solution_designer_f2b4e2caca934cedbc658ff7a95bfb0b` shows the screenshot's run-level totals are exactly the sum of two persisted usage events:
  - 2026-06-27 16:17:45 UTC: `input=235800`, `cached=232320`, `standard=3480`, `output=930`, `reasoning=328`, latest prompt `235800`.
  - 2026-06-28 03:34:53 UTC: `input=234630`, `cached=233344`, `standard=1286`, `output=371`, `reasoning=166`, latest prompt `234630`.
  - Sum: `input=470430`, `cached=465664`, `standard=4766`, `output=1301`, `reasoning=494`.
- Therefore the screenshot cache rate is a cumulative run summary, while `Current prompt` is the latest prompt snapshot. The compaction boundary marker itself does not retroactively rewrite cumulative input/cache totals and may not emit a new token-usage row until the next Codex model usage event.
- A later row for the same run at 2026-06-28 03:43:28 UTC shows compaction had taken effect in prompt size: `latest_prompt_tokens=39781`, context usage `15.4%`, with `input=39781`, `cached=39296`, `standard=485`, `output=190`, `reasoning=31`. The per-turn cache rate still remained `98.8%`, so the run-level aggregate would still round near `99.0%`.
- Interpretation: after compaction, the most reliable visible signal is `Current prompt` dropping on the next provider usage event, not the cumulative run cache-hit rate. The cache-hit rate can remain high if the compacted prompt still consists mostly of stable cached instructions/tools/summary state plus a tiny new suffix.
- Thinking-token interpretation before the accounting fix: the UI's `Thinking` value is summing persisted Codex `reasoningOutputTokens` rows. The displayed `494` exactly equals `328 + 166` from persisted rows, but the live/prod total-vs-last evidence shows persisted rows can undercount reasoning when same-turn updates are collapsed. So small thinking values can be legitimate for short/model-light turns, but they can also be too low under the confirmed overwrite bug.

### Follow-up finding: lost/undercounted Codex usage increments

- User asked whether Autobyteus is reacting to every Codex token event and therefore did not miss token events. Code evidence says the server does react to `thread/tokenUsage/updated` notifications in `codex-thread-notification-handler.ts`, and a fresh live probe confirms those notifications reach `CodexThread.recordTurnTokenUsage`. However, accounting can still lose usage before persistence.
- Current code path:
  - `handleAppServerNotification` resolves usage and calls `codexThread.recordTurnTokenUsage(turnId, usage)`.
  - `CodexThread.recordTurnTokenUsage` stores the payload in `pendingTurnTokenUsage: Map<string, CodexReadyTurnTokenUsage>` keyed only by `turnId`.
  - If the turn is still active, `markTurnTokenUsageReady` does not add it to the ready set until idle/completed.
  - A later token-usage update for the same active `turnId` executes `pendingTurnTokenUsage.set(turnId, usage)` again, overwriting the previous pending usage.
  - Result: in multi-call/tool-loop turns, earlier Codex `last` payloads can be received but not persisted/accounted; only the final one may survive.
- Raw cumulative evidence from follow-up screenshot run `solution_designer_f2b4e2caca934cedbc658ff7a95bfb0b` supports this concern:
  - From 2026-06-27 16:17:45 to 2026-06-28 03:34:53, Codex cumulative total input increased from `6,050,809` to `6,750,757`, a delta of `699,948`, but the persisted `last.inputTokens` for the later event is only `234,630`; unreconciled input delta is about `465,318`. Cumulative reasoning increased by `712`, but the later `last.reasoningOutputTokens` is only `166`; unreconciled reasoning delta is `546`.
  - From 2026-06-28 03:34:53 to 2026-06-28 03:43:28, cumulative input increased by `1,238,728`, but persisted `last.inputTokens` is only `39,781`; unreconciled input delta is about `1,198,947`. Cumulative reasoning increased by `1,628`, but persisted `last.reasoningOutputTokens` is only `31`; unreconciled reasoning delta is `1,597`.
- Fresh live gpt-5.5 accounting probe on 2026-06-28:
  - Probe script: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-token-cache-rate-statistics/tickets/in-progress/codex-token-cache-rate-statistics/scripts/codex-token-accounting-live-probe.e2e.test.ts`.
  - Evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-token-cache-rate-statistics/tickets/in-progress/codex-token-cache-rate-statistics/experiment-evidence/2026-06-28T03-57-58-441Z-codex-token-accounting-live-probe.json`.
  - Full-normalized-object rerun: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-token-cache-rate-statistics/tickets/in-progress/codex-token-cache-rate-statistics/experiment-evidence/2026-06-28T04-05-58-694Z-codex-token-accounting-live-probe.json`.
  - Summary: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-token-cache-rate-statistics/tickets/in-progress/codex-token-cache-rate-statistics/live-codex-token-accounting-experiment-summary.json`.
  - Method: monkey-patched `CodexThread.recordTurnTokenUsage`, sent a baseline direct turn, then sent a tool-heavy turn requiring two separate shell reads.
  - Observed `recordTurnTokenUsage` calls in confirmed runs: `4`. Persisted ledger rows: `2`. Websocket `TOKEN_USAGE_UPDATED` messages: `2`.
  - Tool-heavy turn had three `recordTurnTokenUsage` calls with the same turn id. Later same-turn calls had `hadPendingBefore=true`, meaning a prior pending usage payload for the same active turn already existed and was overwritten.
  - Accounted ledger row for the tool-heavy turn kept only the final same-turn payload. In the full-capture rerun, same-turn received increments were `input/output = 11050/89`, `11200/89`, and final `11349/32`; only final `11349/32` was persisted/emitted.
  - Full normalized object capture shows each `recordTurnTokenUsage` call contains `raw_usage_json` from selected `tokenUsage.last` plus `raw_event_json` containing both `tokenUsage.total` cumulative counters and `tokenUsage.last` per-update counters. The outer notification method/envelope is not stored in `raw_event_json`, only the params payload (`threadId`, `turnId`, `tokenUsage`).
- Interpretation: This is not a transport/websocket miss. We did receive multiple Codex token-usage notifications for the same active turn. The bug is internal accounting collapse: `pendingTurnTokenUsage` is keyed by `turnId`, so later same-turn notifications overwrite earlier pending usage before the turn becomes ready/idle.

### Total-vs-last relationship findings

- Relationship analysis artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-token-cache-rate-statistics/tickets/in-progress/codex-token-cache-rate-statistics/codex-total-vs-last-relationship-report.json` aggregates all accounting-probe captures.
- Across `7` comparable consecutive captured update pairs, `tokenUsage.total` deltas matched `tokenUsage.last` for `inputTokens`, `cachedInputTokens`, `outputTokens`, `reasoningOutputTokens`, and `totalTokens` with `0` mismatches.
- This supports the rule: `total` is cumulative and `last` is the per-update increment. Output and reasoning/thinking tokens follow the same relationship as input/cache tokens.
- Production sample artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-token-cache-rate-statistics/tickets/in-progress/codex-token-cache-rate-statistics/codex-total-vs-last-production-sample.json` compares persisted production rows with nonzero reasoning.
- Rows where `total` delta is larger than persisted `last` show that persisted rows skipped/collapsed intermediate provider updates; rows that appear to be first/complete updates often match exactly, including reasoning tokens such as `last_reason=516` and `delta_reason=516`, `last_reason=1184` and `delta_reason=1184`, and `last_reason=425` and `delta_reason=425`.


### Claude Agent SDK live experiment findings

- Probe script artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-token-cache-rate-statistics/tickets/in-progress/codex-token-cache-rate-statistics/scripts/claude-token-accounting-live-probe.e2e.test.ts`.
- Evidence files:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-token-cache-rate-statistics/tickets/in-progress/codex-token-cache-rate-statistics/experiment-evidence/2026-06-28T05-44-29-779Z-claude-token-accounting-live-probe.json`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-token-cache-rate-statistics/tickets/in-progress/codex-token-cache-rate-statistics/experiment-evidence/2026-06-28T05-46-24-053Z-claude-token-accounting-live-probe.json`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-token-cache-rate-statistics/tickets/in-progress/codex-token-cache-rate-statistics/live-claude-token-accounting-experiment-summary.json`
- Direct-turn run: 2 app turns produced 61 raw SDK chunks, 2 terminal `result` chunks, 2 usage-bearing raw chunks, 2 websocket `TOKEN_USAGE_UPDATED` messages, and 2 ledger rows.
- Tool-loop run: 3 app turns produced 153 raw SDK chunks, 3 terminal `result` chunks, 3 usage-bearing raw chunks, 3 websocket `TOKEN_USAGE_UPDATED` messages, and 3 ledger rows.
- The tool-forcing turn successfully produced a terminal result with `num_turns=3`. Its raw result usage was `input_tokens=205`, `cache_read_input_tokens=44800`, `output_tokens=219`; the ledger row had `standard_input_tokens=205`, `cache_read_input_tokens=44800`, and `accounting_input_tokens=45005`, matching `base_excludes_cache` semantics.
- In both live Claude runs, `result.usage` and summed `result.modelUsage` matched exactly for input, output, cache read, and cache creation tokens.
- Interpretation: Claude Agent SDK does not currently have the Codex same-turn overwrite/cumulative-vs-last issue. Claude usage rows are terminal result aggregates. Assistant/tool/system chunks can be numerous but do not carry usage accounting fields.

### Claude Agent SDK production `usage` vs `modelUsage` sample

- Artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-token-cache-rate-statistics/tickets/in-progress/codex-token-cache-rate-statistics/claude-modelusage-production-sample.json`.
- Local production DB currently has only 2 `runtime_kind='claude_agent_sdk'` ledger rows in the sampled table; both preserve `result.usage` and `result.modelUsage`.
- In both rows, `modelUsage` totals are higher than `usage`:
  - `daily_assistant_9517...`: `modelUsage - usage = +1133 input, +88 output`.
  - `codex_4e406...`: `modelUsage - usage = +444 input, +427 output`; cache-read matched at `111360`.
- Current `buildClaudeTokenUsageEvent` chooses `result.usage` first and only uses `modelUsage` as fallback/context source when `usage` is absent or missing dimensions.
- Interpretation: This is not the same bug as Codex because no multiple usage events were lost. It is a separate source-authority risk: if `modelUsage` is the more complete billed/cost source in some SDK cases, Claude rows may undercount. Current live probes did not reproduce the divergence, so this should be preserved as a diagnostic/design decision rather than folded blindly into the Codex fix.

### Shared token usage normalization architecture

- Provider/runtime-specific extraction occurs before the shared event boundary:
  - AutoByteus native runtime emits `TOKEN_USAGE_UPDATED` from `autobyteus-ts` LLM phase observations.
  - Codex app server maps `thread/tokenUsage/updated` in `codex-thread-token-usage.ts` and `codex-agent-run-backend.ts`.
  - Claude Agent SDK maps terminal `result.usage`/`modelUsage` in `claude-session-token-usage.ts` and `claude-session-event-converter.ts`.
- All runtimes then pass through `TokenUsageEventEnrichmentTransformer`:
  1. `createTokenUsageUpdatedPayload` normalizes the event shape,
  2. `TokenUsageContextEnricher` attaches run/team/member/task identity,
  3. `TokenUsageComponentBasisResolver` resolves `gross_includes_cache` vs `base_excludes_cache` into standard/cache/gross buckets,
  4. `TokenUsageSnapshotDeltaNormalizer` diffs only `usage_scope='cumulative_snapshot'` rows and leaves `per_call`/`per_turn` as direct deltas,
  5. `TokenCostCalculator` estimates API price,
  6. `TokenUsageEventPersistenceProcessor` appends the enriched row.
- Frontend Token Meter and GraphQL summaries consume normalized backend fields; they should not parse raw Codex or Claude provider payloads.

## Correct Solution Direction

- Backend must treat each Codex usage update or cumulative-snapshot advancement as the accounting unit, not the completed turn as a single accounting slot.
- Preferred Codex source of truth: use `tokenUsage.total` cumulative snapshots as an authoritative series and convert them into deltas per Codex thread/run.
- Codex first snapshot handling must avoid charging all historical thread totals. The initial accounted delta should use `tokenUsage.last` by deriving an initial baseline of `current total - last`, or an equivalent explicit baseline mechanism.
- Subsequent Codex snapshots should account `current tokenUsage.total - previous tokenUsage.total` for all token fields: gross input, cached input, output, reasoning, and total tokens.
- Codex `tokenUsage.last` should be preserved for first-snapshot baseline, validation, diagnostics/quality flags, and current/latest request context display metadata.
- Do not use `pendingTurnTokenUsage: Map<turnId, usage>` as the Codex provider accounting gate when same-turn updates can arrive. If turn lifecycle still needs a ready/completed signal, accounting deltas must be queued/persisted independently or reconciled from cumulative snapshots without collapse.
- Do not apply the Codex cumulative-delta fix to Claude Agent SDK based on current evidence. Claude should remain terminal-result/per-turn unless future captured SDK data shows cumulative or multi-update usage streams.
- For Claude, preserve both `result.usage` and `result.modelUsage`; add or retain diagnostics for divergence. A source-authority change from `usage` to `modelUsage` should be a deliberate follow-up or an explicit design decision, not an accidental side effect of the Codex fix.
- Add idempotency/deduplication for duplicate/replayed Codex snapshots. If provider event ids are unavailable, derive a stable key from run/thread/turn plus cumulative counter tuple or snapshot sequence.
- Add quality/diagnostic flags for cumulative counter regression, total-delta vs `last` mismatch, missing first-baseline fields, unreconciled/partial usage data, and possibly Claude `usage`/`modelUsage` divergence.
- Frontend should not compute provider-specific deltas. It should display corrected backend summaries and clarify copy:
  - cumulative cards should be labeled as run totals (input/output/thinking/cost),
  - `Current prompt` should remain latest request/current context size,
  - cache-hit tooltip/label should clarify it is run-total cached input divided by run-total gross input,
  - optionally add a latest-request section if product wants immediate per-request visibility after compaction.

## Constraints / Dependencies / Compatibility Facts

- Must work in task worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-token-cache-rate-statistics` on branch `codex/codex-token-cache-rate-statistics`.
- Must distinguish provider-reported cache fields from locally inferred fields.
- Must keep authoritative usage parsing/reconciliation in backend owners; avoid UI-only correction if backend accounting fields are wrong.
- Must preserve raw provider usage payloads enough for diagnostics and future reconciliation.
- Must not preserve incorrect legacy behavior through dual accounting paths or compatibility fallbacks.
- Must avoid overcounting first cumulative snapshots that include historical Codex thread totals before the Autobyteus run/snapshot series begins.

## Open Unknowns / Risks

- Resolved: Raw usage data for the exact original screenshot turn is available locally and was inspected.
- Resolved: Codex app server reports prompt-cache fields as `cachedInputTokens` / `cached_input_tokens`; prior probes confirmed gross input semantics.
- Resolved: Pricing UI and backend are aligned for the inspected high-cache row; no defect found in cache bucket math or cost split.
- Resolved: Fresh live probes reproduce 99%+ cache rates under realistic stable-prefix reuse and show expected drop/recovery behavior when novel prompt content is introduced.
- Resolved: Autobyteus receives multiple same-turn Codex token-usage notifications; the miss is pending-storage overwrite, not transport.
- Resolved: `tokenUsage.total`/`tokenUsage.last` relationship has been verified in live Codex probes for input, cached input, output, reasoning, and total tokens.
- Resolved: Claude Agent SDK live direct/tool-loop probes did not reproduce a Codex-like same-turn overwrite issue; terminal results, websocket usage messages, and ledger rows matched 1:1.
- Risk: First cumulative snapshot baseline must be implemented carefully to avoid overcounting historical provider totals.
- Risk: Historical ledger rows are already undercounted; backfill/repair is out of current forward-fix scope unless explicitly added.
- Risk: If Codex emits cumulative snapshots without stable event ids, idempotency must be derived carefully from thread/turn/counter tuple or sequence.
- Risk: Provider invoice reconciliation was not performed; this investigation verifies Codex app-server/Claude SDK reported behavior and Autobyteus accounting lineage.
- Risk: Claude production rows show `result.modelUsage` can exceed `result.usage`; current live probes did not reproduce this, so source authority remains an open diagnostic/design question.
- UX risk: Users may still read `Cache hit 99.8%` as an Autobyteus-estimated KV-cache statistic or expect compaction to reset cumulative cards unless labels/tooltips clarify the display.

## Notes For Architect Reviewer

Implementation design is recommended and should focus on Codex backend usage ingestion, not on changing the generic cache-rate formula. The architecture review should verify that the design establishes a single authoritative Codex usage-snapshot reconciliation boundary, accounts cumulative `tokenUsage.total` deltas exactly once, uses `tokenUsage.last` for first-baseline/validation, removes the same-turn pending overwrite hazard, and keeps frontend provider-agnostic. Claude Agent SDK should not receive the Codex cumulative-delta treatment unless the design explicitly expands scope; current live evidence supports terminal-result/per-turn semantics. The only Claude-related design consideration is whether to add diagnostics/quality flags for `usage` vs `modelUsage` divergence. Frontend changes should be limited to labels/tooltips or an optional latest-request presentation layer; the UI must not become responsible for provider-specific accounting.
