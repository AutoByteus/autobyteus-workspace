# Investigation Notes

## Investigation Meta

- Package identifier: `token-meter-accuracy`
- Request / ticket: Project Task `project_task_cb40258d-0311-4675-bdd4-8ff49253b576` (delegated by `/project_task_manager`, run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`)
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy` / `codex/token-meter-accuracy`
- Resolved base remote / branch / revision: `origin/personal` @ `927796780` (fetched 2026-10-09)
- Finalization target remote / branch: `origin/personal`
- Bootstrap result: worktree created from refreshed `origin/personal`; ticket folder `tickets/in-progress/token-meter-accuracy/`
- Bootstrap blocker: None
- Current solution revision ID: `SR-003`
- Authorities read (requirements reading gate; file and date): `.claude/skills/solution-designer/references/requirements-engineering.md` (2026-10-09); `AGENTS.md`; `DESIGN.md` (head, 2026-10-09)
- Authorities read (design reading gate, 2026-10-09): `references/architecture-design.md`, `design-principles.md`, `DESIGN.md` (full), `autobyteus-server-ts/docs/design/data_migration_guideline.md`, `templates/design-spec-template.md`
- Investigation status: Requirements and architecture investigation complete

## Initial Request And Clarifications

- Original request: Token Meter accuracy on Claude Agent SDK runs, suspected general module problem. (A) "Latest prompt" 97.3% (972,533 / 1,000,000) and sometimes >100% without compaction; (B) a running delegated team member shows 0 tokens, unknown model/runtime, 0 model calls. Review the module end to end, explain compaction per runtime, fix shared causes, verify across runtimes and run kinds.
- Clarifications received (user, 2026-10-09, this conversation):
  1. "maybe we shouldn't use our own statistics. We should use the statistics from the agent SDK itself."
  2. "If the agent SDK can give us all the data, and maybe we need to do some conversion ... then we'll use their data as much as possible, because the data they gave us is mostly accurate ... I think that's a goal, so you need to do enough experiments."
- User-supplied facts and constraints: screenshots `user-17-latest-prompt-97.png` (PTM run, Claude SDK, 97.3 %, gross 1.65 B, cache hit 98.3 %, mixed currencies) and `user-16-running-member-zero.png` (running delegated SD, 0 tokens, unknown model/runtime, 0 calls). User expects compaction around ~80 %.
- Initial ambiguity: what "our own statistics" meant. Resolved: AutoByteus already reads SDK numbers, but chose the wrong SDK field and derived the percentage itself; the goal is to take each runtime's own figure for each quantity wherever the runtime provides it.

## Product And Domain Understanding

- Product area: Token Meter (right-panel "Token" tab) and the server token-usage module (`autobyteus-server-ts/src/token-usage`, runtime adapters in `src/agent-execution/backends/*`).
- Affected actors: users watching any run (standalone, team member, delegated copy, Org member) on any runtime.
- Terminology: *Latest prompt* = tokens in the context sent with the latest model call (input + cache read + cache write); *context window* = the scale the runtime measures against; *compaction threshold* = point at which the runtime compacts; *gross input* = lifetime sum of all prompt tokens across calls (cached + uncached); *cache hit* = cache-read share of gross input.

## Source Log

| Date | Type | Exact Source / Command | Why | Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-10-09 | Doc | `autobyteus-server-ts/docs/modules/token_usage.md` | Module contract | Claude SDK usage starts at terminal `result`; latest prompt = `result.usage` input + cache read + cache creation over `modelUsage[selected].contextWindow` | Verified wrong (P1) |
| 2026-10-09 | Code | `backends/claude/session/claude-session-token-usage.ts` | Claude mapping | `latest_prompt_tokens = result.usage.input + cache_read + cache_creation`; `contextWindow` from `modelUsage` row | Root cause A |
| 2026-10-09 | Code | `backends/claude/session/claude-session.ts:436-447` | When usage emitted | Usage emitted only in `turnResult` | Root cause B |
| 2026-10-09 | Contract | `@anthropic-ai/claude-agent-sdk@0.3.280` `sdk.d.ts` `SDKResultSuccess.usage` | Field meaning | "MAIN AGENT LOOP ONLY … per-turn in streaming-input sessions"; `num_turns` = model round-trips within one turn; `modelUsage` cumulative per model incl. compaction; `getContextUsage()` returns totalTokens/rawMaxTokens/percentage/autoCompactThreshold | Use SDK context API |
| 2026-10-09 | Data | `sqlite3 -readonly ~/.autobyteus/server-data/db/production.db` on `token_usage_run_records` | Real distribution | Claude SDK: 197 of 341 records >100 %, max 6,759 %; Codex 0 >100 % (max 93.2 %); native 0 (max 31.3 %); AGY/Grok: no latest prompt at all | — |
| 2026-10-09 | Data | same DB, `architecture_reviewer_925a92ce…` | Sum proof | one report, gross 4,025,193 = latest prompt 4,025,193 (402.5 %) | — |
| 2026-10-09 | Data | same DB, AGY records | AGY semantics | e.g. `daily_assistant_feb311e7…` gross 5,205,514, cache read 75,673,874, standard 0 | Root cause AGY |
| 2026-10-09 | Data | `~/.autobyteus/server-data/memory/agents/project_task_manager_7c8dce0c…/collaboration/software_engineering_team_47e5e68d…/solution_designer_2b6e326c…/raw_traces_active.jsonl` + DB | B on real run | first trace 09:04:25 UTC; first usage record 09:09:02 UTC; ~60 tool calls in first turn; record later attributed correctly (claude_agent_sdk / claude-opus-5-5) | Attribution OK; timing is the cause |
| 2026-10-09 | Code | `autobyteus-ts/src/agent/loop/llm-phase.ts:36-43,252-265` | Native | Per call; prompt = input (+cache read + cache creation for base-excludes semantics); percent over `effectiveContextCapacity` | Correct; preserve |
| 2026-10-09 | Code | `autobyteus-ts/src/agent/token-budget.ts`, `memory/policies/compaction-policy.ts` | Native compaction | Threshold = `compactionRatio` (default 0.8, overridable) × input budget (window − reserved output − safety margin); compaction default disabled unless configured | Explains "~80 %" expectation |
| 2026-10-09 | Code | `backends/codex/thread/codex-thread-token-usage.ts` | Codex | Per call (`thread/tokenUsage/updated`); latest prompt = `last.inputTokens`; window = `modelContextWindow` | See P6/P7 |
| 2026-10-09 | Code | `backends/antigravity/stream/agy-stream-event-converter.ts:218-236` | AGY | Only the terminal `result` cumulative usage is mapped, as `gross_includes_cache`; no latest prompt/window | Root cause AGY |
| 2026-10-09 | Code | `backends/grok/grok-build-call-usage.ts` | Grok | Per call; `base_excludes_cache`; no latest prompt/window | Gap |
| 2026-10-09 | Code | `autobyteus-web/components/workspace/usage/TokenUsageMeterPanel.vue:13-25` | Display | Shows `contextWindowUsagePercent` and `latestPromptTokens / effectiveContextWindowTokens`; no compaction marker | — |
| 2026-10-09 | Doc | `tickets/done/agy-compaction-analysis/investigation-notes.md` A06–A17 + probes | AGY compaction | AGY compaction = `step_update` checkpoint; threshold internal (`compaction_threshold` in internal proto only) | — |
| 2026-10-09 | Other | `~/.codex/models_cache.json` | Codex windows | `context_window` 272,000, `effective_context_window_percent` 95, `auto_compact_token_limit` null | — |
| 2026-10-09 | Other | `strings` on bundled Claude CLI (`claude-agent-sdk-darwin-arm64@0.3.280`) | SDK compaction knobs | `CLAUDE_CODE_AUTO_COMPACT_WINDOW`, `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`, `DISABLE_AUTO_COMPACT`, setting `autoCompactWindow` | P3 |
| 2026-10-09 | Code | `tickets/in-progress/anthropic-prompt-caching/design-spec.md` (worktree `anthropic-prompt-caching`) | Coordination | That task changes the Sonnet 5 catalog price, native Anthropic request caching, docs `token_usage.md` (~l.381) and pricing tests; no runtime-adapter or fold change | Ownership split below |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Trigger / Contract | Current Path | Current Outcome | Evidence | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Claude SDK turn result | `result.usage` (sum of all main-loop calls in the turn) → latest prompt; ÷ `modelUsage.contextWindow` | Latest prompt is a multi-call sum; 58 % of Claude SDK records >100 % | P1, P2, DB | High |
| BEH-002 | System | Claude SDK run working | Usage event only at terminal `result` | Running member: 0 calls, unknown model/runtime until its turn ends (4.5 min on the user's run) | code, DB + traces | High |
| BEH-003 | System | AGY turn result | Cumulative `result.usage` mapped as `gross_includes_cache`; per-call `step_update` usage ignored | Cache reads exceed gross input; usage only at turn end; no latest prompt | P8, A15 probe, DB | High |
| BEH-004 | System | Codex per-call update | `last.inputTokens` / `modelContextWindow` | Per call and live; after compaction Codex sends `last.inputTokens = 0` with `totalTokens` = new context size → momentary 0 % | P5–P7 | High |
| BEH-005 | System | Native AutoByteus per call | provider usage per call / effective context capacity | Correct per-call prompt; ≤31.3 % observed | code, DB | High |
| BEH-006 | System | Grok Build per call | per-call usage, no latest prompt | Latest prompt absent | code, DB | High |
| BEH-007 | System | Usage attribution | run_id → record; team/delegated/Org attribution | Correct once usage arrives (delegated SD later recorded with model/runtime) | DB | High |
| BEH-008 | System | Claude SDK totals/cost | `modelUsage` selected-model deltas, catalog pricing | Totals exact for the selected model (incl. SDK compaction calls); auxiliary models (e.g. Haiku title call) excluded; catalog cost equals SDK `costUSD` | P1, P2 | High |

## Runtime, Probe, Or Reproduction Findings

All probe scripts and raw outputs are in `probes/`. Runs used the user's local logins in isolated temp working directories (Codex: private `CODEX_HOME` with a temporary auth copy, removed after the run).

| ID | Method / Command | Scenario | Observation | Implication | Evidence |
| --- | --- | --- | --- | --- | --- |
| P1 | `node probes/claude-sdk-usage-probe.mjs claude-haiku-4-5 … multi` | 1 turn with 3 sequential Bash calls (4 model calls), then a plain turn | Per-call usage arrives live on each `assistant` message (input/cache exact; output partial: 3, 1, 2, 3). `result.usage` = sum of the 4 calls (input 34 = 10+8+8+8; cache read 13,656 = 0+0+6,753+6,903; cache write 11,303 = 4,249+6,753+150+151) → "prompt" 24,993. `getContextUsage()` = **7,062** = last call 8 + 6,903 + 151. `modelUsage` cumulative across turns and includes an auxiliary `claude-haiku-4-5-20251001` row (935 in). | Root cause A proven; SDK context figure = latest call's prompt | `probes/P1-haiku-multi.jsonl` |
| P2 | same, `claude-opus-5-5`, `includePartialMessages` | as P1 | `message_delta` stream events carry **final** per-call usage incl. output and `thinking_tokens` (72+123+72+5 = 272 = result output). Opus 5.5: `rawMaxTokens` 1,000,000, `autoCompactThreshold` **967,000**, category "Autocompact buffer" 33,000. SDK `costUSD` 0.0533254 = catalog 8×$4 + 12,987×$0.20 + 5,657×$8 (1h) + 272×$20 per M = 0.0533254. P1 Haiku: SDK 0.0262206 = catalog. | Live exact per-call usage available; SDK compacts at window − 33k (96.7 % for 1M); SDK cost = catalog | `probes/P2-opus55-multi-partial.jsonl` |
| P3a/b/c | `settings.autoCompactWindow`, `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=50`, `CLAUDE_CODE_AUTO_COMPACT_WINDOW=60000` | single turn | Only the `CLAUDE_CODE_AUTO_COMPACT_WINDOW` env var changed the window; it clamps to a 100,000 minimum; threshold = window − 33,000 (67,000) | SDK threshold is configurable via env | `/tmp/p3a-c` (summarised here) |
| P3 | `CLAUDE_CODE_AUTO_COMPACT_WINDOW=100000 … fill` (4 × ~45k-token user messages) | real auto-compaction | Turn 2: SDK tried to compact before sending (projected prompt over 67k) and **failed** (`compact_result: failed`, `too_few_groups`); prompt then sat at **94,643 = 95 %** (above the 67k threshold, legitimately). Turn 3: compaction succeeded; `compact_boundary` `pre_tokens` 131,336, `post_tokens` 37,880; context 51 %. Summariser call usage appears only in `modelUsage` (not in per-call messages nor `result.usage`). `modelUsage.contextWindow` stayed 200,000 while the SDK's window was 100,000. | Window/threshold must come from `getContextUsage`; turn-end `modelUsage` reconciliation still needed for compaction calls; "above threshold" can be genuine after a failed compaction | `probes/P3-haiku-autocompact.jsonl` |
| P4 | `PROBE_MIDTURN=1 … multi` | `getContextUsage({detail:'summary'})` after each call, mid-turn | Answers within ~4 ms; equals each call's prompt exactly (6,546 / 6,784 / 6,936 / 7,088 / 7,166) | SDK context figure is available live after every call without API cost | `probes/P4-haiku-midturn-context.jsonl` |
| P5 | `python3 -I probes/codex-usage-probe.py … multi` (codex-cli 0.161.0, gpt-6-luna) | 3 sequential commands | One `thread/tokenUsage/updated` per model call, live; `last` = that call (input incl. cache); `modelContextWindow` 258,400 (= 272,000 × 95 %); new field `cacheWriteInputTokens` (0) | Codex already per call/live | `probes/P5-codex-luna-multi.jsonl` |
| P6 | `… fill -c model_auto_compact_token_limit=60000` | Codex compaction | Compaction runs at turn start (`contextCompaction` item) when the previous context ≥ limit; then an update with `last.inputTokens = 0`, `last.totalTokens = 68,630` (post-compaction size). Summariser usage not added to `total`. | Codex's own context size = `last.totalTokens`; current mapping briefly shows 0 % | `probes/P6-codex-luna-autocompact.jsonl` |
| P7 | `… fill6` (default limit) | Codex default compaction | Prompts 51k → 93k → 134k → 176k → 218k (84.2 %) → **259,056 (100.3 % of 258,400)**; compaction before the next turn; then 68,670 → 82,492. Default limit lies between 217,535 and 259,062 (consistent with 90 % of 272k = 244,800). | Codex can genuinely exceed 100 % of its reported (95 %) window | `probes/P7-codex-luna-default-compaction.jsonl` |
| P8 | `node probes/agy-usage-probe.mjs multi gemini-3.8-flash-low` (agy 1.3.2) | 3 commands | Each `agent_response` `step_update` (DONE) carries that call's usage live (11,903 / 12,061 / 12,219 / 12,377 in); `result.usage` cumulative across the conversation (48,560 then 61,009). | AGY per-call live usage available | `probes/P8-agy-multi.jsonl` |
| P8b | earlier AGY probe `tickets/done/agy-compaction-analysis/probes/agy-stream-auto-compaction-raw.jsonl` | cache semantics | step 3: `input_tokens` 81,507 + `cache_read_tokens` 90,059 = ~171.6k prompt (two 90k dumps); `total_tokens` = input + output (excludes cache) | AGY input **excludes** cache reads (`base_excludes_cache`) | same |

## Compaction Per Runtime (evidence summary)

| Runtime | Who compacts | When | Threshold | Reported to AutoByteus |
| --- | --- | --- | --- | --- |
| Claude Agent SDK | SDK auto-compact | Before sending a new prompt whose projected size crosses the threshold | `autoCompactThreshold` = window − 33,000 (Opus 5.5: 967,000 = 96.7 % of 1M; Haiku 4.5: 167,000 = 83.5 % of 200k); window configurable via `CLAUDE_CODE_AUTO_COMPACT_WINDOW` (min 100k) | `getContextUsage()`; `system/status compacting`; `compact_boundary {pre_tokens, post_tokens}`; failed attempts as `compact_result: failed` |
| Codex | Codex | At turn start (and when needed) when the previous context ≥ auto-compact limit | Not reported; default between 217.5k and 259k for 272k models (≈ 90 % of 272k); configurable `model_auto_compact_token_limit` | `contextCompaction` item; post-compaction `last.totalTokens` |
| Antigravity | AGY | Internal | Not exposed (internal `compaction_threshold`) | `step_update` `checkpoint` |
| Native AutoByteus | AutoByteus memory compaction (when enabled) | After a call whose prompt ≥ trigger | `compactionRatio` (default 0.8) × input budget (window − reserved output − safety margin) | Own event stream |

The user's "~80 %" expectation matches native AutoByteus, not the Claude SDK (96.7 % on Opus 5.5). The PTM record's 97.3 % was a multi-call sum, not the context fill.

## Persisted Data And State Facts

- Affected stored subject: `token_usage_run_records.latest_prompt_tokens`, `effective_context_window_tokens`, `context_window_usage_percent` (latest snapshot fields); AGY cumulative token components and cost columns.
- Representative volume (user DB): 341 Claude SDK records (197 >100 %), 34 AGY records, 1,390 Codex, 369 native, 4 Grok.
- Readers/writers: written by `TokenUsageRunAccumulator` fold; read by GraphQL summaries and the meter.
- Raw per-call usage is not retained, so historical Claude SDK latest-prompt values and AGY gross/cache splits cannot be recomputed exactly. AGY records do retain cumulative input and cache-read totals (gross could be re-derived as input + cache read, but cost components were captured at observation time and are never repriced by module rule).
- Remaining evidence gap: none for the decision; the treatment of historical values is a user decision (DEC-005).

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related IDs | Status | Approval |
| --- | --- | --- | --- | --- | --- | --- |
| `probes/claude-sdk-usage-probe.mjs`, `probes/show.py` | SD | Repeatable Claude SDK usage probe | P1–P4 | REQ-002..005 | Evidence | Not behavior-defining |
| `probes/codex-usage-probe.py` | SD | Repeatable Codex probe | P5–P7 | REQ-006 | Evidence | Not behavior-defining |
| `probes/agy-usage-probe.mjs` | SD | Repeatable AGY probe | P8 | REQ-007 | Evidence | Not behavior-defining |
| `probes/P*.jsonl` | SD | Raw probe outputs | all | — | Evidence | — |
| `user-16-running-member-zero.png`, `user-17-latest-prompt-97.png` | User | Reported symptoms | B, A | — | Evidence | — |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| U-001 | Unknown | Codex exact default auto-compact limit | Explaining Codex compaction | Bounded by P7; not needed for display (Codex does not report it) | Accepted |
| U-002 | Unknown | AGY context window / threshold | AGY bar scale | AGY does not report them; DEC-003 | Open (decision) |
| U-003 | Unknown | Codex `cacheWriteInputTokens` semantics when non-zero | Codex cache-write mapping | Always 0 in probes; record as follow-up | Accepted |
| R-001 | Risk | Enabling SDK partial messages changes the frame mix the Claude session processes | Regression in text/tool projection | Architecture phase | Open |
| R-002 | Risk | Live per-call contributions plus turn-end cumulative reconciliation could double count | Totals | Architecture phase; acceptance criteria require equality with SDK totals | Open |
| R-003 | Risk | Overlap with Anthropic/Gemini caching tasks in docs and pricing | Merge conflicts | Ownership split: pricing catalog/calculator stay with caching tasks; this task owns runtime adapters, latest-context fields, live usage and the meter's context card | Open |

## Requirement Implications

- The defect is not "our own counting" but choosing the wrong runtime field (Claude SDK) or ignoring available per-call fields (Claude SDK, AGY) and misreading semantics (AGY). Every runtime under test exposes per-call usage live; Claude SDK additionally exposes its own context accounting and compaction threshold.
- ">100 %" has two different origins: a counting bug (Claude SDK sums) and genuine overflow of a runtime-reported effective window (Codex 100.3 %, Claude SDK after failed compaction 95 % > 67 % threshold). Requirements must forbid the first and show the second truthfully.

## Architecture Investigation Findings

| ID | Source / Command | Observation | Design implication |
| --- | --- | --- | --- |
| AF-01 | `token-usage/projections/token-usage-run-fold.ts` | One observation → one contribution priced with one policy resolved by `TokenUsageRunAccumulator` before the transaction. Claude results take a dedicated branch (`reconcileClaudeSdkResult`), cumulative snapshots their own, everything else is additive. | Keep one model per observation; Claude per-call observations use the additive branch plus a state update. |
| AF-02 | `token-usage/projections/token-usage-run-record-state.ts` `applyTokenUsageContribution` | Every admitted observation increments `usage_report_count` and, if latest, overwrites latest runtime/model **and** latest prompt/window/percent (a null reading erases the previous one). Codex no-advance updates are suppressed entirely, so a post-compaction reading is never stored. | Need an explicit "this observation is a model call" fact and "a context reading is present" rule. |
| AF-03 | `token-usage/projections/claude-sdk-model-usage-reconciler.ts` | State `{version:1, checkpoints, selectedDetails, latestSelectedRawModelId, partial}` decoded strictly (unknown shape → `claude_sdk_checkpoint_invalid`, state reset). Only the selected model contributes; series restart admits `result.usage` main-loop as the delta; cache split from main-loop when it reconciles, else 1h assumed. | Extend state with per-session live sums via a tolerant reader (guideline §3); remainder = cumulative delta − live sums; restart admits 0. Main-loop-based split/restart code becomes removable. |
| AF-04 | `token-usage/services/token-usage-run-accumulator.ts` | Claude result pricing uses the selected row's canonical model and refuses non-first-party providers; other observations use generic `resolvePolicy(payload)`. | Claude per-call observations use the generic path with the API response model id. |
| AF-05 | `token-usage/projections/token-usage-analytics-contribution.ts:74` | Every contribution adds `usageReportCount: 1n` to the daily facet. | Facet count must follow the model-call fact; reading-only observations write no facet. |
| AF-06 | `token-usage/projections/token-usage-run-aggregate.ts:59-76` | Claude-only branch derives a percentage from old rows with null percent. | Becomes dead once pre-fix Claude readings are cleared → remove. |
| AF-07 | `backends/claude/session/claude-turn-tracker.ts:52-60`, `claude-text-segment-projector.ts:167-205` | `stream_event` is already a content frame kind and the text projector renders partial text deltas from it. No current option enables partial messages, so that path is dormant. | Enabling `includePartialMessages` would change text projection; usage-bearing stream events must be consumed by the session and **not** forwarded to the turn tracker. |
| AF-08 | `runtime-management/claude/client/claude-sdk-client.ts:386-421`, `claude-sdk-streaming-session.ts` | Query options built in one place; session handle wraps `query` (exposes `resolveSelectedModel`, not `getContextUsage`). | Add `includePartialMessages: true`; add a context-usage read on the session handle. |
| AF-09 | Transcript `~/.claude/projects/...jsonl`, P2 | API response `message.model` = `claude-opus-5-5` while `modelUsage` key may be `claude-opus-5-5[1m]` (DB: 39 `[1m]` checkpoints, canonical `claude-opus-5-5`). | Per-call identity = API response model id (what Anthropic bills); raw/canonical mapping stays turn-end only. |
| AF-10 | DB checkpoints (314 Claude runs) | Auxiliary `claude-haiku-4-5-20251001` in 290 runs; ≈ $1.89 vs ≈ $7,268.62 main (0.03 %). Catalog has no Haiku 4.5 entry (`anthropic-supported-model-definitions.ts`). | Including auxiliary models would mark 290/314 runs `partial_price_missing` for 0.03 % of spend → DEC-002 revised to (b) (SR-003). |
| AF-11 | `backends/antigravity/stream/agy-stream-event-converter.ts:84,195-240` | `agentResponse(...)` handles `agent_response` steps; usage mapped only from `result`. P8: per-step usage sums equal the cumulative result (48,560); A15: likewise across compaction. | Map per-step usage; remove cumulative result mapping. |
| AF-12 | `prisma/migrations/20260923130000_add_claude_sdk_usage_state/migration.sql`; `startup/token-usage-current-schema-readiness.ts:19-20` | Additive columns are plain `ALTER TABLE`; startup readiness lists required columns. | New nullable `context_compaction_threshold_tokens` column + readiness list; one SQL migration also clears pre-fix Claude readings. |
| AF-13 | `services/agent-streaming/team-agent-event-websocket-projector.ts:62-64`, `agent-collaboration/execution/events/*` | Strict team/collaboration DTOs copy latest prompt/window/percent explicitly. | Threshold must be added to the same strict DTOs. |
| AF-14 | `autobyteus-ts/src/agent/loop/llm-phase.ts:85-104,252-265` | `compactionTokenBudget.triggerThresholdTokens` is computed before each call when compaction is enabled. | Native emits it as the compaction threshold. |
| AF-15 | `worktrees/anthropic-prompt-caching` design; `worktrees/gemini-native-cache-hit` (no artifacts yet) | Anthropic task changes catalog prices, native request caching, pricing tests and a pricing paragraph of `token_usage.md`. | No overlapping source files; docs edits in different sections. |
| AF-16 | PTM message 2026-10-09; `git log 927796780..origin/personal`; `git show dd4b3de4a`; `git merge-tree --write-tree HEAD origin/personal` | Gemini task merged to `origin/personal` (3913a75d6, 033a6d780). It changed the AGY **result** mapping to `base_excludes_cache` (one line) and Gemini 3.1 Pro catalog prices. A dry-run merge with this branch shows one content conflict, in `agy-stream-event-converter.ts`. The upstream converter test (result-usage semantic) and fold test auto-merge. | Root cause identical to our BEH-003. Our D-5 supersedes it: the result usage mapping is removed and per-step usage is `base_excludes_cache`. Delivery integration: resolve the conflict in favor of this branch, adapt the upstream converter test to per-step usage (the result emits no usage), and keep the upstream fold test (generic cumulative path) and catalog prices. The PTM's Claude lead is already root cause A (P1). |

## Notes For Architecture Design

- Claude SDK: candidate sources are `getContextUsage({detail:'summary'})` after each call (P4) and `message_delta` final usage with `includePartialMessages` (P2), or `assistant` message usage (output partial, P1); turn-end `modelUsage` delta remains the authority for compaction/auxiliary calls (P3).
- Existing reconciler (`claude-sdk-model-usage-reconciler.ts`) and cumulative-snapshot fold must not double count live per-call contributions.
- AGY: map `step_update` usage per call, `base_excludes_cache`; reconsider the cumulative `result` mapping.
- Codex: context size from `last.totalTokens`.
