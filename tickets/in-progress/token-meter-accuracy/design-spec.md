# Design Spec — Token Meter Accuracy

## Solution And Approval Basis

- Current solution revision ID: `SR-005`
- Approved requirements baseline / revision and user-approval reference: `requirements-doc.md` SR-002, approved by the user in conversation on 2026-10-09 ("I trust your decisions … decisions should be reflecting the truth … I will approve your reasonable decisions and then use the design principles to work on it now"). SR-003 revises DEC-002 to (b) under that explicit delegation on evidence AF-10.
- Behavior-defining supplements and their approval references: None
- Design status: `Ready` (round 3: ARCH-F-001/002 resolved in SR-004; ARCH-F-003 shared contract schemas mapped in SR-005)
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/investigation-notes.md`
- Authorities read (2026-10-09): `references/architecture-design.md`, `design-principles.md`, `DESIGN.md` (repository root), `autobyteus-server-ts/docs/design/data_migration_guideline.md`, `autobyteus-server-ts/docs/modules/token_usage.md`; `design-examples.md` not used.
- Project design-principle conflicts or discrepancies: None. `token_usage.md` states Claude latest prompt = terminal `result.usage` sum; that statement is the defect and is rewritten in this change.

## Current-State Read

Every runtime adapter turns provider usage into a transient `TOKEN_USAGE_UPDATED` payload. The event pipeline enriches it and the awaited `TokenUsageRunAccumulator` folds it into one `token_usage_run_records` row per run inside a SQLite transaction. The fold also writes a daily analytics facet and returns `run_summary_after_event`, which the standalone, team and collaboration live paths forward to the Token Meter.

Verified problems (investigation notes P1–P8, AF-01–AF-15):

- Claude Agent SDK emits usage only at terminal `result`. It reports `result.usage` (a sum of every main-loop call in the turn) as the latest prompt, and the model's window from `modelUsage` as the scale (BEH-001, BEH-002).
- Antigravity maps only the cumulative `result`, as cache-inclusive input, although AGY input excludes cache reads; it ignores per-step usage (BEH-003).
- Codex reads `last.inputTokens`; a post-compaction update (input 0, total 68,630) is suppressed by the fold because the cumulative total did not advance (BEH-004, AF-02).
- Grok reports per call but sets no latest prompt (BEH-006).
- The fold has no notion of "model call" vs "reconciliation" vs "context reading". Every admitted observation increments the report count and overwrites the latest model and context; a null reading erases the previous one (AF-02, AF-05).
- No runtime's compaction threshold reaches the meter, though the Claude SDK and native runtime both know it (P2, AF-14).

Preserved and healthy: native per-call accounting, Codex cumulative accounting, run attribution and roll-ups, pricing and catalog (owned by the caching tasks), idempotency and regression protections.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Large`
- Size rationale: changes span four runtime adapters (Claude SDK, Antigravity, Codex, Grok) plus the native runtime in `autobyteus-ts`, the shared token-usage payload contract, fold/reconciler/analytics, Prisma schema and a SQL data update, GraphQL and three strict live DTOs, and the frontend meter (~35 files across 3 packages).
- Architectural risk: `High`
- Risk rationale: shared observation contract change (`reports_model_call`, compaction threshold); accounting semantics (Claude live per-call plus turn-end remainder must not double count); persisted schema addition and data update; Claude SDK option change (`includePartialMessages`) that alters the frame mix.
- Escalation trigger: if implementation finds per-call usage sums that do not reconcile with `modelUsage` deltas beyond SDK compaction calls, if partial messages alter visible chat output, or if any other reader depends on the cleared Claude readings, return `Design Impact`.

## Architecture Investigation Evidence

| Source / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| P1, P4 | `probes/P1-haiku-multi.jsonl`, `probes/P4-haiku-midturn-context.jsonl` | `result.usage` = sum of calls; `getContextUsage({detail:'summary'})` = latest call prompt, available mid-turn in ~4 ms | D-1 context reading from the SDK after each call | — |
| P2 | `probes/P2-opus55-multi-partial.jsonl` | `message_delta` carries final per-call usage incl. output/thinking; sums equal `result.usage`; threshold 967,000 | D-2 per-call usage from `message_delta` | — |
| P3 | `probes/P3-haiku-autocompact.jsonl` | Compaction calls only in `modelUsage`; failed compaction leaves context above the threshold | D-3 turn-end remainder; REQ-009 truthful overflow | — |
| P5–P7 | `probes/P5…P7` | Codex per call; post-compaction `last.totalTokens`; 100.3 % genuine | D-6 | Default Codex limit unreported |
| P8, A15 | `probes/P8-agy-multi.jsonl`; `tickets/done/agy-compaction-analysis/probes/` | AGY per-step usage; sums equal cumulative result; input excludes cache | D-5 | — |
| AF-01–AF-15 | `investigation-notes.md` § Architecture Investigation Findings | fold/state/analytics/DTO facts | D-4, D-7, D-8 | — |

## Intended Change

Each runtime adapter reports **one model call per observation**, carrying the runtime's own per-call usage and, where the runtime has it, the runtime's own context reading (tokens in use, window, compaction threshold). The fold counts model calls only from model-call observations and keeps the latest context reading from the latest observation that carries one. Claude SDK turn-end results become reconciliation-only. They add what per-call data cannot see (the SDK's own compaction calls) as the cumulative `modelUsage` delta minus usage already admitted per call. Antigravity switches to per-step usage with corrected cache semantics. Codex uses `last.totalTokens`. The meter shows the compaction threshold and marks a genuine runtime-reported overflow. Pre-fix Claude readings are cleared once.

Decisions:

- **D-1 Claude context reading:** after each main-loop call, the session reads `getContextUsage({detail:'summary'})`. Latest prompt = `totalTokens`, window = `rawMaxTokens`, threshold = `autoCompactThreshold` (only when `isAutoCompactEnabled`), percent = 100 × tokens / window.
- **D-2 Claude per-call usage:** enable `includePartialMessages`. The session consumes `stream_event` frames itself: `message_start` gives the API response model and cache-write TTL split; `message_delta` gives final usage. Only main-loop frames (`parent_tool_use_id` null) produce observations. Stream events are never forwarded to the turn tracker, so chat projection is unchanged.
- **D-3 Claude turn-end reconciliation:** the `result` observation contributes `max(0, modelUsage[selected] delta − live sums since the checkpoint)` per dimension, and is not a model call. Series restart: re-anchor and admit 0 (live already counted). Auxiliary models are excluded (DEC-002 b).
- **D-4 Observation contract:** add `reports_model_call: boolean` and `context_compaction_threshold_tokens: number | null`. Latest runtime/model update only from model-call observations; the latest context group updates from any observation whose `latest_prompt_tokens` is non-null.
- **D-5 Antigravity:** per-step `step_update` usage → per-call observation, `base_excludes_cache`, latest prompt = input + cache read, no window (DEC-003). The cumulative `result` mapping is removed.
- **D-6 Codex:** latest prompt = `last.totalTokens`; `reports_model_call` = last input + output > 0; a non-advancing update with a reading stores the reading.
- **D-7 Persistence:** additive nullable column `context_compaction_threshold_tokens`. One Prisma SQL migration adds it and clears latest prompt/window/percent on existing Claude SDK rows (DEC-005).
- **D-8 Meter UI:** threshold marker and label; overflow mark when percent > 100; tooltip states the value is the runtime's own context for the latest model call.
- **D-9 Live freshness key (ARCH-F-001):** `usage_report_count` means model calls only, so it can no longer order summaries. Every run summary carries `revision`: the sum of `token_usage_run_records.revision` over the records it summarizes (for an exact run, that row's revision; for team and standalone roll-ups, the sum over their members, which only grows because records are never deleted and roll-up membership only grows). The fold increments `revision` on **every** save, including reading-only saves (Codex compaction) and zero-call Claude remainder saves. The web store orders summaries by `revision`, not `usageReportCount`. The team live-partial aggregate adds `1` to `usageReportCount` only when the event's `reports_model_call` is true.
- **D-10 Claude emission order (ARCH-F-002):** the frame pump already awaits `onFrame` (`claude-session-process.ts:89-91`). `ClaudeSession.handleFrame` awaits `ClaudeCallUsageTracker.observe(frame)`, which awaits `readContextUsage()` (bounded by its ≤2 s timeout) and then emits the `claude_sdk_call` event synchronously, before `handleFrame` returns. No later frame (including `result`) is processed before that emission. Emission order equals fold order: `AgentRunEventDispatchQueue` serializes events per run and `TokenUsageRunAccumulator` serializes folds per run (`serializeRun`). Fire-and-forget emission is forbidden.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Requirement / AC IDs | Trigger | Existing Behavior / Evidence | Approved Change Or Preserved Outcome | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | REQ-001, REQ-002, REQ-009, REQ-010; AC-001, AC-002, AC-008 | Claude main-loop call completes | Turn-wide sum; model window (P1) | SDK context reading after each call | DS-001 |
| BEH-002 | System | REQ-003, REQ-004, REQ-008; AC-003, AC-004 | Call completes / turn result | Turn-end only | Per-call contribution + turn-end remainder | DS-001, DS-002 |
| BEH-003 | System | REQ-005; AC-005 | AGY step DONE with usage | Cumulative result, wrong cache semantic | Per-step, base-excludes-cache | DS-003 |
| BEH-004 | System | REQ-006; AC-006 | Codex token update | `last.inputTokens`, compaction suppressed | `last.totalTokens`, reading stored | DS-003 |
| BEH-005 | System | REQ-010; AC-008, AC-009 | Native call | Correct | + compaction threshold | DS-003 |
| BEH-006 | System | REQ-007; AC-007 | Grok call | No latest prompt | Latest prompt | DS-003 |
| BEH-007 | System | REQ-008; AC-003, AC-009 | Any run kind | Attribution OK | Preserved; live within one call | DS-004 |
| BEH-008 | System | REQ-009; AC-002 | Display | Counting artefacts >100 % | Only genuine overflow, marked | DS-004 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related IDs | Relationship | Status |
| --- | --- | --- | --- | --- |
| `probes/*.mjs`, `probes/*.py`, `probes/P*.jsonl` | Captured runtime frames | AC-001–AC-007 | Source of unit-test fixtures (copy minimal frames into tests) | Evidence |

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix` (with a small behavior addition: threshold display)
- Current design issue found: `Yes`
- Structural triggers that fire:
  - *Shared-structure tightness:* the observation payload conflates "contribution", "model call" and "context reading"; the fold infers all three from mere admission (AF-02, AF-05). A null reading erases a valid one; reconciliation results count as calls.
  - *Legacy cleanup:* Claude main-loop restart delta and main-loop cache split (AF-03); Claude read-time percent derivation (AF-06); AGY cumulative-result mapping (AF-11) all become obsolete.
  - Ruled out: *authoritative-boundary* (adapters → pipeline → accumulator → fold is respected); *repeated coordination* (one fold owner); *ambiguous identity* (run_id stays the only key).
- Root cause classification: `Shared Structure Looseness` (observation contract) plus `Local Implementation Defect` per adapter (Claude field choice, AGY cache semantic, Codex field choice).
- Refactor needed now: `Yes`, bounded. Tighten the observation contract with two explicit facts and remove the obsolete paths; no new subsystem.
- Evidence: P1–P8; AF-01–AF-15.
- Design response: D-1…D-8.
- Refactor rationale: without the explicit model-call fact, live per-call plus turn-end reconciliation would inflate call counts and erase readings, and the Codex compaction reading cannot be stored.
- Intentional deferrals and residual risk: the dormant partial-stream text path in `claude-text-segment-projector.ts` stays (unrelated to usage; stream events no longer reach it either way). Codex `cacheWriteInputTokens` mapping is deferred (always 0). Auxiliary Claude models remain excluded (DEC-002 b, 0.03 % of spend).

## Terminology

- **Model-call observation:** an observation reporting exactly one provider model call (`reports_model_call = true`).
- **Context reading:** latest prompt tokens, window, percent and compaction threshold as reported or derived by the runtime for its latest call.
- **Turn-end remainder:** Claude SDK `modelUsage` delta for the agent's model minus usage already admitted per call since the last checkpoint.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Removed in scope: Claude `result.usage`-based latest prompt and model-window capacity; `claude_sdk_main_loop_usage` payload field and its validator; reconciler series-restart main-loop delta and main-loop cache split; aggregate Claude read-time percent derivation; AGY cumulative `result` usage mapping and its `agy_provider_reported_cumulative_usage` flag.
- No dual path: Claude has one live source (per-call) and one reconciliation source (result); AGY has one source (per-step).

## Persisted Data / State Transition Decision (Mandatory)

Two subjects.

**(1) `token_usage_run_records` — new column and pre-fix Claude readings**

- Stored subject: `token_usage_run_records`, ~2,138 rows on the user's install (341 Claude SDK).
- Change: add nullable `context_compaction_threshold_tokens BIGINT`. Existing Claude SDK `latest_prompt_tokens` / `effective_context_window_tokens` / `context_window_usage_percent` hold multi-call sums (wrong meaning; 197 rows >100 %, up to 6,759 %).
- Reader/writer behavior: the fold writes the latest context columns; readers project them unchanged. A null threshold means "not reported", which is truthful for every pre-existing row.
- Required semantics: lifetime totals, costs, identity, checkpoints untouched.
- Decision: `Migration Required` for the Claude readings (change of meaning; guideline §3); `Directly Usable — No Migration` for the new column (optional field whose absence has truthful meaning).
- Rationale: the old values cannot be recomputed (no per-call history). Clearing them is the truthful disposition ("not available") and costs one indexed-free `UPDATE` over ≤ a few thousand rows.

### Migration Plan

- Current schema: `prisma/schema.prisma` model `TokenUsageRunRecord`.
- Source shape: rows with `latest_runtime_kind = 'claude_agent_sdk'` written before this release.
- Why not direct use or rebuild: direct use shows impossible values; there is no source to rebuild them from.
- Trigger: `Deployment` — Prisma migration `prisma/migrations/<timestamp>_token_meter_context_readings/migration.sql`, applied by the existing Prisma deploy step before app-data migrations and before any new write.
- Owner: that SQL migration file only; no runtime code knows about pre-fix rows.
- Normal path stays current-only: after deployment every Claude reading is written by the new adapter.
- Completion marker: Prisma `_prisma_migrations` ledger.
- Restart safety: one SQL migration runs in one transaction; Prisma re-applies a failed migration only after its rollback.
- Validation: post-migration, `SELECT count(*) … WHERE latest_runtime_kind='claude_agent_sdk' AND latest_prompt_tokens IS NOT NULL` = 0 (deployment test with a released-shape fixture).
- Backup / rollback: none needed; the cleared values are known-wrong derived data, not user content; totals untouched.
- Concurrency: the embedded server applies the migration at startup before serving.
- Retention: the migration file stays in history.

| Step | Source | Target | Owner | Validation | Failure |
| --- | --- | --- | --- | --- | --- |
| 1 | no column | `ALTER TABLE "token_usage_run_records" ADD COLUMN "context_compaction_threshold_tokens" BIGINT;` | SQL migration | readiness column list | migration fails → Prisma rolls back; startup reports schema failure as today |
| 2 | Claude rows with readings | `UPDATE "token_usage_run_records" SET "latest_prompt_tokens" = NULL, "effective_context_window_tokens" = NULL, "context_window_usage_percent" = NULL WHERE "latest_runtime_kind" = 'claude_agent_sdk';` | same file | count = 0 | same transaction |

Data-migration checklist (guideline §2):

1. *Need:* change of meaning → yes.
2. *Availability:* only a derived display field is cleared; no gating.
3. *Source/target:* inspected the user's released DB (341 rows); target = null readings.
4. *Disposition:* every Claude row cleared; non-Claude untouched.
5. *Commit/retry:* the Prisma migration transaction.
6. *Current-only:* yes.
7. *Cost:* one `UPDATE`.
8. *References:* none.
9. *Evidence:* migration test on a released-shape fixture.
10. *Lessons:* the minimal-mechanism lessons from `token-usage-one-row-per-agent-run` were applied.

**(2) `claude_sdk_usage_state_json` (reconciler state)**

- Change: add per-session live sums; stop writing `version`; `selectedDetails`, `latestSelectedRawModelId` and `partial` keep their meaning.
- Decision: `Directly Usable — No Migration`. The decoder becomes tolerant (guideline §3: convert strict readers when touched). It requires `checkpoints`, treats a missing `live` as empty (truthful: nothing was admitted live before the upgrade) and ignores `version`.

## Data-Flow Spine Inventory

| Spine ID | Scope | Behavior IDs | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, BEH-002 | Claude SDK `message_delta` | Meter context card + totals | `ClaudeSession` → `TokenUsageRunAccumulator` | Fix A and B on Claude |
| DS-002 | Primary End-to-End | BEH-002 | Claude SDK `result` | Run totals (remainder) | Claude reconciler in fold | Totals equal SDK |
| DS-003 | Primary End-to-End | BEH-003–BEH-006 | AGY step / Codex update / Grok call / native call | Run record | Each adapter → fold | Same contract on all runtimes |
| DS-004 | Return-Event | BEH-007, BEH-008 | Fold `run_summary_after_event` | Token Meter panel (any run kind) | Live transport + meter store | Live display everywhere |
| DS-005 | Bounded Local | BEH-002 | Fold receives observation | Record + facet saved | `foldTokenUsageObservation` | Call/reading/contribution rules |

## Primary Execution Spine(s)

- DS-001: `Claude CLI stream_event(message_delta) → ClaudeSession frame intake → ClaudeCallUsageTracker (+ getContextUsage) → TOKEN_USAGE_UPDATED (claude_sdk_call) → event pipeline → TokenUsageRunAccumulator → fold (additive + live sums) → run record → run_summary_after_event → Token Meter`
- DS-002: `Claude CLI result → ClaudeSession turnResult → claude_sdk_result observation → TokenUsageRunAccumulator → fold → Claude reconciler (delta − live) → run record`
- DS-003: `AGY step_update / Codex thread/tokenUsage/updated / Grok response_completed / native LlmPhase → adapter → TOKEN_USAGE_UPDATED (model call + reading) → pipeline → accumulator → fold → run record`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Each main-loop call's final usage arrives as `message_delta`. The session pairs it with the call's `message_start` (model, TTL split), asks the SDK for its context reading, and emits one model-call observation. The fold adds it to totals, adds it to the session's live sums, counts one call and stores the reading. | Claude session, call usage tracker, accumulator, fold | `ClaudeSession` (emission), fold (accounting) | SDK context read, pricing |
| DS-002 | At turn end the result observation carries cumulative `modelUsage`. The reconciler differences the agent's model row against its checkpoint, subtracts live sums, and contributes the remainder (SDK compaction calls). It is not a call and carries no reading. | reconciler | fold | checkpoint state |
| DS-003 | Every other adapter already sees one call per report; it emits the call's usage with the runtime's own context fields. | adapters | fold | — |
| DS-004 | The persisted summary flows through the existing standalone/team/collaboration live paths to the meter, now including the threshold. | transport, meter store, panel | meter store | formatting |

## Spine Actors / Main-Line Nodes

Claude CLI/SDK; `ClaudeSession`; `ClaudeCallUsageTracker` (new, session-owned); event pipeline; `TokenUsageRunAccumulator`; `foldTokenUsageObservation`; Claude reconciler; run repository; live transports; Token Meter store/panel. Non-Claude adapters: AGY converter, Codex usage resolver, Grok call usage builder, native `LlmPhase`.

## Ownership Map

- `ClaudeSession`: frame intake and routing. It decides that `stream_event` frames go to the call-usage tracker and never to the turn tracker.
- `ClaudeCallUsageTracker`: per-message pairing of `message_start` and `message_delta` within the open process; builds the per-call observation; owns the SDK context read call (through the session handle).
- `buildClaudeTokenUsageEvent` (existing file): turn-end result observation only (reconciliation fields; no reading; `reports_model_call: false`).
- Fold: the three rules (D-4), dispatch to the Claude reconciler for both Claude ingestion kinds, and `revision + 1` on every save (D-9).
- Claude reconciler: checkpoints, live sums, remainder; tolerant state decoding.
- Analytics contribution: facet count follows `reports_model_call`; reading-only observations write no facet.
- Adapters: field meaning conversion only (REQ-001).

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade | Owner Behind | Why | Must Not Own |
| --- | --- | --- | --- |
| `ClaudeSdkStreamingSession.readContextUsage()` | SDK `query.getContextUsage` | Keep SDK access behind the session handle | Usage policy |

## Removal / Decommission Plan (Mandatory)

| Item | Why Unnecessary | Replaced By | Scope | Notes |
| --- | --- | --- | --- | --- |
| `latest_prompt_tokens`/`context_window_usage_percent` from `result.usage` and `modelUsage.contextWindow` in `claude-session-token-usage.ts` | Wrong meaning | `ClaudeCallUsageTracker` + SDK context reading | In This Change | |
| `ClaudeSdkMainLoopUsage`, `isClaudeSdkMainLoopUsage`, `claude_sdk_main_loop_usage` payload field | Restart delta and split no longer use main loop | Live sums | In This Change | `domain/claude-sdk-usage.ts`, `agent-run-token-usage.ts` validator |
| Reconciler `selectedCacheSplit` and series-restart main-loop delta | Per-call observations carry the exact split; restart admits 0 | Remainder rule | In This Change | Remainder TTL split stays the existing flagged 1h assumption |
| Claude branch of `latestContext` in `token-usage-run-aggregate.ts` | Pre-fix rows cleared; new rows store percent | Uniform projection | In This Change | |
| AGY `result` usage mapping, flag `agy_provider_reported_cumulative_usage` | Per-step usage is complete | Per-step mapping | In This Change | Existing AGY rows keep their snapshot-series state; it is no longer read for AGY |
| Strict `version`-checked reconciler state decode | Guideline §3 | Tolerant projection | In This Change | |

## Return Or Event Spine(s) (If Applicable)

DS-004: `fold → run_summary_after_event → standalone websocket / team-agent-event-websocket-projector / agent-presentation-message-projector → strict shared contract schemas (team-stream summary DTO, presentation summary DTO and live token event) → web mapper → meter store (freshness guard by revision; team live-partial merge) → TokenUsageMeterPanel`. Transport ownership is unchanged. Fields added: `context_compaction_threshold_tokens` and `revision` on the run summary, and `reports_model_call` on the live event. The store's freshness rule changes from `usageReportCount` to `revision` (D-9).

Example (Codex compaction, P6): the record is at revision 41 with 12 model calls. The post-compaction reading saves revision 42, still 12 calls, latest prompt 68,630. The store accepts it because 42 > 41. Under the old guard (12 ≤ 12) it was dropped. The team partial aggregate keeps 12 calls because `reports_model_call` is false.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `foldTokenUsageObservation`.
- `observation → idempotency check → contribution by kind (claude call | claude result | cumulative snapshot | additive) → apply(totals; +1 call iff reports_model_call; latest identity iff reports_model_call ∧ latest; latest reading iff reading present ∧ latest) → save iff anything changed → facet iff tokens or call`
- Why it matters: this is where double counting, inflated call counts and erased readings were prevented or caused.
- Parent owner: `ClaudeCallUsageTracker`.
- `message_start(id, model, cache_creation split) → [content frames ignored] → message_delta(final usage) → await SDK context read (≤2 s) → emit observation (before handleFrame returns) → forget id`

## Off-Spine Concerns Around The Spine

| Concern | Spines | Serves | Responsibility | Why | Risk If On Main Line |
| --- | --- | --- | --- | --- | --- |
| SDK context read | DS-001 | `ClaudeCallUsageTracker` | `getContextUsage({detail:'summary'})`, **awaited** inside frame intake (D-10) with a ≤2 s timeout; failure/timeout → observation without reading + flag `claude_sdk_context_usage_unavailable` | SDK's own context | An unbounded wait would stall frame intake; the timeout bounds it. Not awaiting would let `result` overtake the call (double count) |
| Pricing | DS-001–003 | fold | Existing `TokenCostCalculator` | Unchanged owner | — |
| Component basis | all | fold | Existing resolver (`base_excludes_cache` for Claude/AGY/Grok) | Unchanged | — |

## Ownership Boundaries

Adapters own field meaning; the fold owns accounting rules; the reconciler owns Claude cumulative state; transports own delivery; the frontend renders server facts only. The Claude session handle is the only owner of SDK calls.

## Boundary Encapsulation Map

| Authoritative Boundary | Encapsulates | Callers | Forbidden Bypass | If Too Thin |
| --- | --- | --- | --- | --- |
| `ClaudeSdkStreamingSession` | SDK `query` | `ClaudeSession`, tracker | Tracker calling `query.getContextUsage` directly | Add the method to the handle |
| `TokenUsageRunStore`/accumulator | fold, repository | pipeline transformer | Adapters writing records | — |
| fold | reconciler, record-state | accumulator | Accumulator calling reconciler directly | — |

## Dependency Rules

- Adapters → domain payload builders only; never → token-usage internals.
- `ClaudeCallUsageTracker` → session handle (context read) and event emitter; never → turn tracker or text projector.
- Fold → reconciler/record-state; reconciler has no I/O.
- Frontend → GraphQL/live summary fields only; no recomputation beyond formatting and marker position.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity Shape | Notes |
| --- | --- | --- | --- | --- |
| `TokenUsageUpdatedPayload.reports_model_call: boolean` | one observation | "this is one provider model call" | — | Required in the payload builder; default `true` only for legacy-free adapters that always report calls (native, Grok); explicit elsewhere |
| `TokenUsageUpdatedPayload.context_compaction_threshold_tokens: number \| null` | context reading | runtime-reported threshold | — | Part of the reading group |
| `TokenUsageRunSummaryPayload.context_compaction_threshold_tokens` / GraphQL `contextCompactionThresholdTokens: SafeInt` | run summary | expose threshold | run_id | Also in team/collaboration DTOs |
| `TokenUsageRunSummaryPayload.revision` / GraphQL `revision: SafeInt` | run summary | monotonic freshness key (D-9) | run_id / team run id / standalone roll-up id | Also in the strict team/collaboration `run_summary_after_event` DTOs |
| Live event `reports_model_call` (team/collaboration DTOs) | live event | team partial call count | usage event id | Already on the payload; added to the strict DTO projections |
| `ClaudeSdkStreamingSession.readContextUsage(): Promise<{totalTokens, rawMaxTokens, autoCompactThreshold \| null} \| null>` | SDK context | one summary read | session | null on error/timeout |
| Ingestion kind `claude_sdk_call` (`per_call`) | Claude call | live usage | `idempotency_key = claude_sdk_call:<sessionId>:<message.id>` | model = API response `message.model` |

## Interface Boundary Check

| Interface | Singular? | Identity Explicit? | Ambiguity Risk | Action |
| --- | --- | --- | --- | --- |
| `reports_model_call` | Yes | N/A | Low | — |
| `readContextUsage` | Yes | Yes | Low | — |
| `claude_sdk_call` observation | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

| Node | Name | Natural? | Drift Risk | Action |
| --- | --- | --- | --- | --- |
| Per-call tracker | `ClaudeCallUsageTracker` | Yes | Low | — |
| Model-call fact | `reports_model_call` | Yes | Low | — |
| Threshold | `context_compaction_threshold_tokens` | Yes | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need | Existing Area | Decision | Why |
| --- | --- | --- | --- |
| Claude cumulative state | `claude-sdk-model-usage-reconciler.ts` | Extend | Already owns checkpoints |
| Live delivery | `run_summary_after_event` transports | Extend (field) | Already record-backed |
| Per-call pairing | none | Create New (`claude-call-usage-tracker.ts` in `backends/claude/session/`) | Session file already large; a distinct per-message lifecycle |
| Pricing | `TokenCostCalculator` | Reuse | Owned by the caching tasks |

## Subsystem / Capability-Area Allocation

| Area | Concerns | Spines | Decision |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/claude` | per-call usage, context read, result observation | DS-001, DS-002 | Extend |
| `…/backends/antigravity/stream`, `…/backends/codex/thread`, `…/backends/grok` | adapter field meaning | DS-003 | Extend |
| `autobyteus-ts/src/agent` | native threshold | DS-003 | Extend |
| `autobyteus-server-ts/src/agent-execution/domain` | payload contract | all | Extend |
| `autobyteus-server-ts/src/token-usage` | fold, reconciler, analytics, aggregate, persistence | DS-005 | Extend |
| `autobyteus-server-ts/prisma` | column + data update | — | Extend |
| shared contract packages `autobyteus-team-stream-contracts`, `autobyteus-agent-presentation-contracts` | strict Zod schemas for the run summary and live token event (ARCH-F-003) | DS-004 | Extend |
| live transports + GraphQL | threshold, revision, reports_model_call fields | DS-004 | Extend |
| `autobyteus-web` meter | threshold, overflow, tooltip | DS-004 | Extend |

## Draft File Responsibility Mapping

See Final mapping; no structure extraction beyond the new tracker was needed.

## Reusable Owned Structures Check

| Repeated Structure | Shared File | Owner | Decision |
| --- | --- | --- | --- |
| Context reading group (prompt, window, percent, threshold) | stays flat in `TokenUsageUpdatedPayload` / run summary (existing flat contract) | domain | Not extracted: the flat snake_case transport contract is established across three DTOs; adding one field keeps one representation |

## Shared Structure / Data Model Tightness Check

| Structure | One Meaning Per Field? | Redundant Removed? | Overlap Risk | Action |
| --- | --- | --- | --- | --- |
| `TokenUsageUpdatedPayload` | Yes after change | `claude_sdk_main_loop_usage` removed | Low | `usage_report_count` now strictly "model calls" (UI label already says so) |
| Reconciler state | Yes | `version` dropped | Low | tolerant reader |

## Final File Responsibility Mapping

| File | Owner | Concrete Concern |
| --- | --- | --- |
| `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-client.ts` (Modify) | SDK client | add `includePartialMessages: true` to query options |
| `…/runtime-management/claude/client/claude-sdk-streaming-session.ts` (Modify) | session handle | `readContextUsage()` (summary detail, ≤2 s timeout, null on failure) |
| `…/agent-execution/backends/claude/session/claude-call-usage-tracker.ts` (Add) | per-call tracker | pair `message_start`/`message_delta` for main-loop frames; build `claude_sdk_call` payload with usage (input, cache read, cache creation, 5m/1h from `message_start.message.usage.cache_creation`, output, `output_tokens_details.thinking_tokens`), model, session, turn, reading, `reports_model_call: true`, `input_token_semantic: base_excludes_cache` |
| `…/backends/claude/session/claude-session.ts` (Modify) | session | `handleFrame` **awaits** `tracker.observe(frame)` for `stream_event` frames and returns without calling `turnTracker.observe` (D-10); reset tracker on process open/exit |
| `…/backends/claude/session/claude-session-token-usage.ts` (Modify) | result observation | remove latest prompt/window/percent and main-loop usage; `reports_model_call: false`; readings null |
| `…/agent-execution/domain/claude-sdk-usage.ts` (Modify) | domain | remove main-loop type/validator; `isClaudeSdkResultIdentity` without main-loop |
| `…/agent-execution/domain/agent-run-token-usage.ts` (Modify) | payload contract | add `reports_model_call`, `context_compaction_threshold_tokens` (payload + run summary); ingestion kind `claude_sdk_call`; drop main-loop field |
| `…/token-usage/projections/claude-sdk-model-usage-reconciler.ts` (Modify) | reconciler | tolerant state; `live` per session; `recordClaudeSdkCall(state, payload)`; remainder rule; restart admits 0 with flag `claude_sdk_series_restart_rebaselined`; flag `claude_sdk_live_exceeds_cumulative` when clamped |
| `…/token-usage/projections/token-usage-run-fold.ts` (Modify) | fold | dispatch `claude_sdk_call` (state + additive contribution); `reports_model_call` gating; reading-only observations saved (Codex compaction) |
| `…/token-usage/projections/token-usage-run-record-state.ts` (Modify) | record state | D-4 rules; threshold field |
| `…/token-usage/projections/token-usage-analytics-contribution.ts` (Modify) | facets | `usageReportCount` from `reports_model_call`; caller skips facet when no tokens and no call |
| `…/token-usage/services/token-usage-run-accumulator.ts` (Modify) | accumulator | facet write only when the contribution has tokens or a call; Claude call pricing via the generic path |
| `…/token-usage/projections/token-usage-run-aggregate.ts` (Modify) | summary | remove Claude-only `latestContext` branch; expose threshold; `revision` = Σ record revisions (safe-integer checked like other totals) |
| `…/token-usage/domain/token-usage-run-record.ts`, `repositories/sql/token-usage-run-record-codec.ts`, `token-usage-run-repository.ts` (Modify) | persistence | threshold column |
| `autobyteus-server-ts/prisma/schema.prisma` (Modify) + `prisma/migrations/<ts>_token_meter_context_readings/migration.sql` (Add) | schema | column + Claude reading clear |
| `…/startup/token-usage-current-schema-readiness.ts` (Modify) | readiness | require new column |
| `autobyteus-team-stream-contracts/src/token-usage-run-summary-dto.ts` (Modify) | shared contract | `tokenUsageRunSummaryDtoSchema` (`.strict()`): add required `revision: nonNegativeSafeIntegerSchema` and `context_compaction_threshold_tokens: nullableNonNegativeSafeIntegerSchema`; also reaches the team live token event via `team-agent-message-dtos.ts:33-35` (no change needed there) |
| `autobyteus-team-stream-contracts/tests/token-usage-run-summary-dto.test.mjs` (Modify) | contract test | a summary with `revision` and threshold parses; one missing `revision` is rejected; an unknown key is still rejected |
| `autobyteus-agent-presentation-contracts/src/token-usage-presentation-dto.ts` (Modify) | shared contract | `agentTokenUsageRunSummarySchema` (`.strict()`): add `revision` (non-negative integer) and `context_compaction_threshold_tokens` (nullable non-negative integer) |
| `autobyteus-agent-presentation-contracts/src/agent-presentation-message-dtos.ts` (Modify) | shared contract | live `token` field set used by `TOKEN_USAGE_UPDATED: z.object(token).strict()` (l.33-57, l.90): add `reports_model_call: z.boolean()` and `context_compaction_threshold_tokens: nullableFiniteNumberSchema` |
| `autobyteus-agent-presentation-contracts/tests/agent-presentation-contracts.test.mjs` (Modify) | contract test | live token event with the new fields parses; the strict unknown-key rejection is unchanged |
| `…/api/graphql/types/token-usage-stats.ts` (Modify) | GraphQL | `contextCompactionThresholdTokens`, `revision` |
| `…/services/agent-streaming/team-agent-event-websocket-projector.ts`, `…/agent-collaboration/execution/events/agent-presentation-event.ts`, `agent-presentation-message-projector.ts`, `collaboration-agent-presentation-adapter.ts` (Modify) | live DTOs | threshold field |
| `…/backends/antigravity/stream/agy-stream-event-converter.ts` (Modify) | AGY | per-step usage observation in `agentResponse` (DONE + usage): `per_call`, `base_excludes_cache`, idempotency `agy:<conversation>:<step_index>`, latest prompt = input + cache read, window null, `reports_model_call: true`; remove `result` usage mapping |
| `…/backends/codex/thread/codex-thread-token-usage.ts`, `…/backends/codex/backend/codex-agent-run-backend.ts` (Modify) | Codex | latest prompt = `last.totalTokens`; `reports_model_call`; threshold null |
| `…/backends/grok/grok-build-call-usage.ts` (Modify) | Grok | latest prompt = input + cache read + cache creation; `reports_model_call: true` |
| `…/backends/autobyteus/events/autobyteus-stream-event-converter.ts` (Modify) | native bridge | pass threshold; `reports_model_call: true` |
| `autobyteus-ts/src/agent/loop/llm-phase.ts`, `agent/events/notifiers.ts`, `agent/streaming/events/stream-event-payload-token-usage.ts` (Modify) | native | emit `context_compaction_threshold_tokens = compactionTokenBudget.triggerThresholdTokens` when compaction is enabled |
| `autobyteus-web/types/tokenUsageMeter.ts`, `services/agentStreaming/tokenUsageRunSummaryMapper.ts`, `graphql/queries/token_usage_meter_queries.ts`, `generated/graphql.ts` (Modify) | frontend data | `contextCompactionThresholdTokens`, `revision`; live event `reports_model_call`. The mapper (l.28) parses every live and fetched summary with the team-stream schema, so it relies on the contract change above; a mapper test shows a summary with `revision` and threshold parses and keeps both fields |
| `autobyteus-web/stores/tokenUsageMeterStore.ts` (Modify) | meter store | guards at `upsertRecordBackedAgentRunSummary` (l.288), `upsertRecordBackedTeamMemberSummary` (l.304): reject when `summary.revision <= current.revision`; `upsertRecordBackedStandaloneRunSummary` (l.389): reject when `<`; `applyPersistedEventToPartialTeamAggregate` (l.207): `usageReportCount + (details.reports_model_call ? 1 : 0)`; summary normalization validates `revision` as a non-negative safe integer |
| `autobyteus-web/components/workspace/usage/TokenUsageMeterPanel.vue`, `localization/messages/{en,zh-CN}/shell.ts` (Modify) | meter UI | threshold marker + "Auto-compacts at N" label; overflow mark ("Over the runtime's window") when percent > 100, bar clamped; tooltip text |
| `autobyteus-server-ts/docs/modules/token_usage.md` (Modify) | docs | rewrite Runtime Adapter Semantics (Claude, Codex, AGY, Grok, native), Additive Observations (model-call / reading rules), compaction per runtime; leave pricing sections to the caching tasks |

## Applied Patterns (If Any)

Adapter (runtime → observation contract); bounded per-message state inside `ClaudeCallUsageTracker`.

## Target Subsystem / Folder / File Mapping

All files stay in their existing folders (table above). The only new file is `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-call-usage-tracker.ts`, next to `claude-session-token-usage.ts`. It must not contain turn lifecycle or pricing.

## Folder Boundary Check

| Path | Depth | Clear? | Risk | Justification |
| --- | --- | --- | --- | --- |
| `backends/claude/session/` | Main-line runtime | Yes | Low | Session-owned concern |
| `token-usage/projections/` | Domain fold | Yes | Low | Existing owner |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why |
| --- | --- | --- | --- |
| Claude turn with 4 calls (P1 numbers) | 4 `claude_sdk_call` observations (prompts 4,259 / 6,761 / 6,911 / 7,062; each +1 call). Result: `modelUsage` delta = Σ calls → remainder 0, no call; latest prompt 7,062 | One result observation with prompt 24,993 | Fix A |
| Claude turn with auto-compaction (P3 turn 3) | Call observation for the post-compaction call; result remainder = the compaction summariser's tokens (input 45,481 = `modelUsage` delta 45,491 − per-call 10, plus its cache/output), no call, no reading | Counting the summariser as a call or dropping it | REQ-004 |
| Codex compaction (P6) | Update with input 0 / total 68,630 → no call, no tokens, reading 68,630 stored | Suppressed; meter keeps 92,936 or shows 0 | REQ-006 |
| AGY step (P8b) | step 3: input 81,507 + cache read 90,059 → gross 171,566, prompt 171,566 | gross 81,507 with cache 90,059 "inside" it | REQ-005 |
| Reading rule | Claude result observation (no reading) leaves the latest call's 7,062 in place | Result erasing the reading to null | AF-02 |
| Freshness (D-9) | Store compares `revision` (41 → 42) | Comparing `usageReportCount` (12 ≤ 12 → dropped) | ARCH-F-001 |
| Emission order (D-10) | `await tracker.observe(delta)` → emit call → next frame `result` | `void tracker.observe(delta)`, so `result` folds first and the late call is counted twice | ARCH-F-002 |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Replacement |
| --- | --- | --- | --- |
| Keep `result.usage` latest prompt as fallback when the context read fails | "Something is better than nothing" | Rejected | Observation without reading + flag; the meter shows the previous reading |
| Keep AGY cumulative result mapping alongside per-step | Safety | Rejected | Per-step only (sums proven equal) |
| Read-time percent derivation for old Claude rows | Old rows | Rejected | Old readings cleared by migration |
| Strict versioned reconciler state | Existing | Rejected | Tolerant projection |

## Derived Layering (If Useful)

N/A — the spine/ownership description is sufficient.

## Change / Refactor Sequence

1. Payload contract (`reports_model_call`, threshold, `claude_sdk_call`, remove main-loop field), fold/record-state/analytics rules and `revision` on every save, with unit tests for D-4/D-9 on existing adapters (all existing adapters set `reports_model_call` explicitly).
2. Shared contract packages first (ARCH-F-003): team-stream summary schema, presentation summary schema and live `token` field set, with their tests; rebuild both packages' `dist` (consumers import `dist/index.js`) before server and web steps.
3. Prisma column + data clear migration, codec/repository/readiness, aggregate cleanup, GraphQL and server live DTO projections (team websocket projector, collaboration adapter/projector) emitting the new fields.
4. Claude: client option, session handle `readContextUsage`, `ClaudeCallUsageTracker`, session routing, result observation reduction, reconciler live sums/remainder/tolerant state. Fixtures from P1–P4.
5. AGY per-step (P8/P8b fixtures), Codex `totalTokens` (P5–P7 fixtures), Grok prompt, native threshold.
6. Frontend `revision` freshness guards and team partial call count (D-9), then threshold/overflow/tooltip; regenerate GraphQL types.
7. Docs `token_usage.md` (adapter and fold sections only).
8. Remove the obsolete paths listed in the Removal plan; delete or rewrite tests that asserted them.

## Key Tradeoffs

- `includePartialMessages` adds stream frames (roughly one per output-token chunk) but is the only SDK surface with exact final per-call usage. They are consumed and dropped at session intake.
- Per-call pricing uses the API response model id (what Anthropic bills). For a model the price list lacks, those calls are `price_missing` and flagged rather than guessed. Today all main models in use (opus-5-5, sonnet-5, fable-5-1) match exactly.
- Claude compaction-call TTL split stays the existing flagged 1h assumption (remainder only; per-call splits are exact).
- Auxiliary models excluded (DEC-002 b).

## Risks

- R-001 partial-message frames reaching projection — mitigated by routing before the turn tracker. Test: transcript text identical with and without the option on P2 frames.
- R-002 double counting — mitigated by live sums in persisted state plus awaited emission (D-10). Tests: P1/P3 fixtures give totals equal to `modelUsage` deltas. Session test with P4 frames and a context read delayed ~10 ms: the `claude_sdk_call` for the final `message_delta` is emitted before the `result` observation, and folded totals equal the `modelUsage` delta.
- Freshness (ARCH-F-001) — store unit tests: a reading-only summary with an equal call count and a higher revision is accepted; a stale revision is rejected; the team partial aggregate does not count a `reports_model_call: false` event.
- RR-1 (per-call Claude pricing provider guard): position. Per-call observations are priced only by exact Anthropic catalog identity of the API response model. AutoByteus configures the Claude SDK only for Anthropic first-party auth (subscription or Anthropic API key); a non-first-party route serving a Claude model id (Bedrock/Vertex) is not a supported configuration (Unclear/unsupported premise). Proxied non-Claude models (e.g. `deepseek-v4-flash`) miss the Anthropic catalog and stay `price_missing`, as today. No behavior change; no extra guard.
- RR-2: AGY `step_index` uniqueness across a resumed conversation is verified during implementation validation on a restored AGY run. If indices restart, the idempotency key adds the AGY process generation.
- RR-3: `token_usage.md` states that Claude `usage_report_count` counted turns before this change and model calls after it.
- RR-4: accepted tradeoff (Key Tradeoffs).
- RR-5: ASM-001 covered by fixture tests from probe frames.
- ARCH-F-003 (strict shared schemas): all three schemas are changed in step 2, before any producer emits the fields. Producers and consumers live in one workspace and change in the same delivery, so there is no mixed-version window. `revision` is required (every server summary producer sets it), while the threshold is nullable.
- R-003 overlap with caching tasks — no shared source files; docs sections disjoint; pricing untouched (REQ-011).
- `getContextUsage` availability on older CLIs — the SDK is pinned at 0.3.280; a failure yields no reading plus a flag.

## Guidance For Implementation

- Build fixtures from the captured probe frames; keep them minimal.
- Live verification (TESTING.md): run a Claude SDK team member through a multi-call turn and check the meter during the turn. Also run real AGY, Codex and native turns; record the numbers next to each runtime's own figures.
- Do not change pricing, catalog values or cost calculator behavior.
- Keep `usage_report_count` label wording ("model calls") and confirm the panel renders the threshold only when present.
