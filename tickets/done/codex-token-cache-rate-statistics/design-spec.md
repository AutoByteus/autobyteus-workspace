# Design Spec

- Ticket: `codex-token-cache-rate-statistics`
- Last Updated: `2026-06-28`
- Status: `Draft for user review - not sent to architecture review`

## Current-State Read

Autobyteus already has the right broad architecture shape for token accounting: runtime-specific adapters translate raw provider/runtime usage into a shared `TOKEN_USAGE_UPDATED` event, then the shared backend token-usage pipeline canonicalizes, enriches, normalizes, prices, persists, and streams the result. The bug is not that the application lacks a normalizer. The bug is that the Codex adapter currently violates the intended accounting unit before the shared pipeline can do the right work.

Current shared pipeline:

`Runtime adapter -> TOKEN_USAGE_UPDATED -> createTokenUsageUpdatedPayload -> TokenUsageContextEnricher -> TokenUsageComponentBasisResolver -> TokenUsageSnapshotDeltaNormalizer -> TokenCostCalculator -> TokenUsageEventPersistenceProcessor -> GraphQL/WebSocket summaries -> Token Meter UI`

Runtime-specific source shapes discovered in this ticket:

| Runtime | Raw usage source | Observed raw semantics | Current/target canonical scope | Correct accounting treatment |
| --- | --- | --- | --- | --- |
| AutoByteus native runtime | `autobyteus-ts` LLM phase token observation | One LLM call observation already represents a direct increment | `per_call` | Direct delta; do not cumulative-diff. |
| Claude Agent SDK | terminal SDK `type=result` chunk with `usage` and `modelUsage` | One terminal result per app turn; even an SDK internal tool loop with `num_turns=3` produced one terminal usage aggregate | `per_turn` | Direct delta; preserve/flag `usage` vs `modelUsage` divergence. |
| Codex app server | `thread/tokenUsage/updated` params with `tokenUsage.total` and `tokenUsage.last` | `total` is cumulative for the Codex thread; `last` is the latest provider update increment | `cumulative_snapshot` | Diff cumulative snapshots per run/thread; use `last` as first-snapshot baseline and validation delta. |

Codex current defect:

1. `resolveCodexThreadTokenUsage` selects `tokenUsage.last` when present and marks it as `usage_scope: "per_turn"`.
2. `CodexThread.recordTurnTokenUsage(turnId, usage)` writes to `pendingTurnTokenUsage: Map<turnId, usage>`.
3. During active tool-heavy turns, multiple Codex usage updates can arrive for the same `turnId` before the turn becomes idle/completed.
4. Later updates overwrite earlier pending usage in the map.
5. Only the final same-turn update reaches persistence/UI, so input, cached input, output, and reasoning/thinking can be undercounted.

Investigation evidence:

- Live Codex probes reproduced legitimate 99%+ cache-hit rates under long stable-prefix prompt reuse. The high cache-hit percentage itself is provider-plausible and should not be “fixed” by changing the formula.
- Codex accounting probes captured multiple same-turn `recordTurnTokenUsage` calls and fewer persisted/websocket rows. In one full capture, same-turn increments were `11050/89`, `11200/89`, and `11349/32` input/output; only the final `11349/32` was persisted.
- Across captured Codex update pairs, `current tokenUsage.total - previous tokenUsage.total = tokenUsage.last` for all comparable fields, including `reasoningOutputTokens`.
- Claude live probes did not reproduce this issue: terminal result chunks, websocket usage events, and ledger rows matched 1:1. Two production Claude rows did show `modelUsage` larger than `usage`, which is a source-diagnostics risk, not the Codex overwrite bug.

Frontend current behavior is downstream of the backend summaries. It does not fabricate the cache rate, but its copy mixes cumulative run-total cards with a latest prompt/current-context card. That makes compaction confusing: compaction changes the latest prompt on the next provider usage event, but cumulative run input/cache/output/thinking totals do not reset.

## Intended Change

Keep the current shared-normalization design, but make its ownership explicit and enforce the missing invariant: **runtime adapters may interpret raw provider data, but they must emit canonical usage observations whose accounting unit matches the provider source semantics.**

Target behavior:

1. Codex app-server token usage becomes an immutable usage-update/cumulative-snapshot stream, not a turn-final slot.
2. Every Codex `thread/tokenUsage/updated` notification is either accounted exactly once or safely deduplicated as a replay of the same cumulative snapshot.
3. Codex main accounting fields are sourced from `tokenUsage.total` and emitted as `usage_scope: "cumulative_snapshot"` with a stable `snapshot_series_key` per Codex run/thread.
4. Codex `tokenUsage.last` is preserved as canonical reconciliation metadata for:
   - first-snapshot baseline (`first accounted delta = last`, not the whole historical thread total),
   - validation against computed cumulative deltas,
   - latest prompt/current-context display metadata.
5. The shared cumulative-snapshot normalizer owns provider-neutral delta reconciliation. It must not parse Codex raw protocol fields directly; Codex supplies normalized reconciliation metadata.
6. Claude Agent SDK and AutoByteus native runtime stay direct-delta paths (`per_turn` and `per_call`). Add Claude divergence diagnostics if in scope, but do not route Claude through Codex cumulative-snapshot reconciliation.
7. Token Meter frontend remains presentation-only for accounting. It should clarify run totals vs latest prompt/current context through labels/tooltips.

This is not a request for a new generic strategy framework. The existing adapter + shared event pipeline is the correct architectural pattern. The design change is to tighten the canonical usage-observation boundary and repair the Codex adapter/normalizer contract.

## Task Design Health Assessment (Mandatory)

- Change posture: Bug fix plus targeted refactor and small UX clarity improvement.
- Current design issue found: Yes, localized to Codex token usage accounting and one missing cumulative-snapshot invariant.
- Root cause classification: `Local Implementation Defect` plus `Missing Invariant`. The shared token-usage subsystem exists and is mostly the right owner; Codex stores the wrong unit of work by turn id before reaching it.
- Refactor needed now: Yes.
- Refactor scope: Codex adapter queueing/parsing plus shared cumulative-snapshot baseline support. Claude/AutoByteus should receive guardrails/diagnostics, not the Codex treatment.
- Evidence basis: requirements and investigation notes in `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-token-cache-rate-statistics/tickets/in-progress/codex-token-cache-rate-statistics/requirements.md` and `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-token-cache-rate-statistics/tickets/in-progress/codex-token-cache-rate-statistics/investigation-notes.md`, plus live probe artifacts under the same ticket directory.
- Design response: restore the correct authoritative boundary: runtime adapters interpret raw shapes, the shared token-usage projection owns accounting deltas, and the frontend presents normalized summaries only.
- Intentional deferrals: historical backfill/repair and Claude `usage` vs `modelUsage` source-authority change are out of the forward-fix unless separately approved. Claude divergence flagging is low-risk and recommended.

## Terminology

- `Raw provider usage`: provider/runtime-specific object such as Codex `tokenUsage`, Claude `result.usage`, Claude `result.modelUsage`, or AutoByteus LLM observation data.
- `Canonical usage observation`: the shared `TOKEN_USAGE_UPDATED` payload shape accepted by `createTokenUsageUpdatedPayload` / `TokenUsageUpdatedPayload`.
- `Direct delta`: a usage event whose fields already represent the increment to charge/display for one call or turn (`per_call`, `per_turn`).
- `Cumulative snapshot`: a usage event whose fields represent cumulative counters and must be differenced against a prior snapshot before pricing/persistence as a run delta.
- `Provider delta metadata`: normalized metadata supplied by an adapter when the provider also reports a per-update increment, e.g. Codex `tokenUsage.last`.
- `Run total`: Autobyteus aggregate over persisted accounted deltas for a run.
- `Latest prompt/current context`: latest provider request prompt/context size, not a cumulative run total.

## Design Reading Order

1. Spine inventory and runtime semantics matrix.
2. Ownership boundaries and canonical observation contract.
3. Codex cumulative-snapshot reconciliation design.
4. Claude/AutoByteus direct-delta guardrails.
5. Frontend display mapping.
6. File responsibilities, removals, and test plan.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Remove/decommission in this change:
  - Codex `pendingTurnTokenUsage: Map<turnId, usage>` as an accounting gate.
  - Treating Codex `tokenUsage.last` as a whole-turn `per_turn` event.
  - Any client-side or adapter-side attempt to repair run totals outside the shared token-usage projection.
- Retain because it is not legacy:
  - Claude `per_turn` terminal-result accounting.
  - AutoByteus native `per_call` accounting.
  - Existing server summary fields and frontend consumption path.

## Data-Flow Spine Inventory

| Spine ID | Scope | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary / shared accounting | Runtime raw usage event | Persisted normalized token ledger row | Token usage event enrichment/projection pipeline | This is the authoritative accounting path for all runtimes. |
| DS-002 | Primary / Codex correction | Codex `thread/tokenUsage/updated` | Accounted cumulative snapshot delta | Codex adapter + snapshot delta normalizer | Fixes the confirmed undercount/overwrite bug. |
| DS-003 | Primary / direct-delta runtimes | AutoByteus LLM observation or Claude terminal result | Direct accounted usage delta | Runtime adapter + component basis resolver | Prevents over-applying Codex logic to runtimes that already emit direct deltas. |
| DS-004 | Return/event UI | Persisted/live token usage summary | Token Meter display | Token usage ledger/store + frontend Token Meter | Makes corrected accounting visible without frontend provider math. |
| DS-005 | Bounded local / reconciliation | Current cumulative snapshot | Costable delta payload | `TokenUsageSnapshotDeltaNormalizer` | Enforces first-baseline, previous-snapshot diff, dedupe, and quality flags. |

## Primary Execution Spine(s)

Shared runtime accounting spine:

`Runtime raw usage -> Runtime adapter parser -> canonical TOKEN_USAGE_UPDATED observation -> context enrichment -> component-basis resolution -> cumulative-snapshot delta normalization/direct pass-through -> cost enrichment -> ledger persistence + websocket summary -> Token Meter UI`

Codex-specific corrected spine:

`Codex thread/tokenUsage/updated -> resolveCodexThreadTokenUsage(total + last) -> Codex immutable usage-update queue -> CodexAgentRunBackend emits TOKEN_USAGE_UPDATED -> TokenUsageSnapshotDeltaNormalizer diffs snapshot -> ledger/UI run summary`

Direct-delta runtime spine:

`AutoByteus LLM observation / Claude terminal result -> runtime adapter emits per_call/per_turn TOKEN_USAGE_UPDATED -> component-basis resolver -> direct pass-through in snapshot normalizer -> ledger/UI run summary`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | All runtimes enter one canonical backend token usage pipeline after adapter-specific extraction. | Raw event, canonical observation, component basis, accounting delta, ledger row, summary | Token usage event enrichment/projection pipeline | Pricing, context enrichment, persistence, websocket mapping |
| DS-002 | Codex cumulative thread totals are treated as snapshots. The provider `last` object is not the whole turn; it is the first-baseline/validation delta. | Codex notification, Codex usage update, cumulative snapshot, provider delta metadata | Codex adapter + snapshot delta normalizer | Idempotency, raw preservation, latest prompt metadata |
| DS-003 | Claude and AutoByteus usage events are already direct increments and must not be diffed as cumulative snapshots. | LLM phase observation, Claude terminal result, direct usage observation | Runtime adapters | Claude `usage`/`modelUsage` divergence flags |
| DS-004 | The UI renders server-accounted run totals and latest prompt context. It does not parse provider raw objects. | Ledger summary, live event, store, component | Token usage ledger/store and Token Meter frontend | Copy/tooltips, localization |
| DS-005 | Cumulative snapshots are reconciled per series: first baseline, previous snapshot lookup, delta calculation, regression/mismatch flags. | Series key, previous snapshot, current snapshot, delta | `TokenUsageSnapshotDeltaNormalizer` | Snapshot metadata helper, store lookup cache |

## Main Domain Subject Nodes

| Node | Role | Ownership |
| --- | --- | --- |
| Runtime adapter parser | provider boundary | Interpret provider-specific raw shapes and emit canonical `TOKEN_USAGE_UPDATED` observations. |
| Canonical usage observation | shared boundary contract | Carry normalized fields, runtime kind, ingestion kind, scope, identity, raw JSON, and quality flags. |
| Token component basis resolver | shared token basis owner | Resolve `gross_includes_cache` vs `base_excludes_cache` into standard/cache/gross buckets. |
| Snapshot delta normalizer | cumulative accounting owner | Convert cumulative snapshots into deltas; leave direct deltas alone. |
| Token cost calculator | pricing owner | Price the normalized delta only. |
| Ledger/store | durable aggregate owner | Persist rows and compute run summaries. |
| Token Meter frontend | presentation owner | Render server summaries and labels; no provider-specific accounting. |

## Ownership Map

- Codex adapter owns Codex field names (`tokenUsage.total`, `tokenUsage.last`, `cachedInputTokens`, `reasoningOutputTokens`, `modelContextWindow`) and converts them into canonical fields/metadata.
- Claude adapter owns Claude SDK result shape (`usage`, `modelUsage`, `num_turns`, cache read/creation fields) and converts it into direct per-turn canonical fields.
- AutoByteus runtime owns native LLM phase observations and emits direct per-call canonical fields.
- Shared token-usage projection owns accounting semantics after canonicalization: component basis, cumulative snapshot diffing, quality flags, pricing basis, and meter deltas.
- Frontend owns display copy/formatting and must not bypass the server projection by reading raw provider payloads.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| Runtime adapter parser | provider raw protocol, source selection, raw preservation | Agent run backends and runtime event bridges | Shared projection or frontend parsing Codex/Claude raw provider fields directly | Add canonical fields/metadata to `TOKEN_USAGE_UPDATED`. |
| Token usage projection pipeline | component basis, cumulative delta, cost enrichment, quality flags | Runtime backends, persistence processors, summary queries | Adapter pre-computing final run totals or frontend recomputing provider deltas | Extend projection helpers/contracts. |
| Token usage ledger/store | durable rows and run summaries | GraphQL, websocket summary hydration, Token Meter UI | UI summing raw events independently | Add summary fields or latest-request fields to the server API. |

## Thin Entry Facades / Public Wrappers

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `CodexAgentRunBackend.consumeReadyTokenUsageEvents` | Codex adapter + token usage projection | Bridges Codex thread usage updates into `AgentRunEventType.TOKEN_USAGE_UPDATED` | Dedup/delta pricing policy beyond emitting canonical observations. |
| GraphQL token summary query | Token usage ledger/store | Hydrates reopened/focused run summaries | Provider raw parsing or cumulative snapshot reconciliation. |
| `TokenUsageMeterPanel.vue` | Token usage ledger/store summaries | Presents usage values to users | Token math or provider-specific correction logic. |

## Target Runtime Semantics Contract

Every runtime adapter must choose exactly one canonical usage semantics before emitting `TOKEN_USAGE_UPDATED`:

| Contract Field | AutoByteus native | Claude Agent SDK | Codex app server |
| --- | --- | --- | --- |
| `runtime_kind` | `autobyteus` | `claude_agent_sdk` | `codex_app_server` |
| `ingestion_kind` | `autobyteus_llm_phase` | `claude_sdk_result` | `codex_thread_token_usage` |
| `usage_scope` | `per_call` | `per_turn` | `cumulative_snapshot` |
| `snapshot_series_key` | `null` | `null` | `codex_thread:${threadId}` (or stable run/thread fallback) |
| Main token fields represent | Direct call increment | Direct terminal result increment | Cumulative thread totals from `tokenUsage.total` |
| Provider-delta metadata | none | none | Canonicalized `tokenUsage.last` fields |
| Latest prompt source | LLM observation prompt | `usage + cache_read + cache_creation` | `tokenUsage.last.inputTokens` |
| Shared normalizer action | direct pass-through | direct pass-through | previous snapshot diff / first-baseline |

This contract is the “strategy” for different runtime raw data. It is expressed through explicit canonical fields, not through a new broad strategy registry.

## Codex Cumulative-Snapshot Design

### Codex parser output

Modify `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-token-usage.ts` so `resolveCodexThreadTokenUsage` returns a renamed shape such as `CodexReadyTokenUsageUpdate` / `CodexTokenUsageSnapshot`, not `CodexReadyTurnTokenUsage`.

Target parser responsibilities:

- Require `tokenUsage.total` for normal Codex accounting. If only `last` is present, either emit a direct-delta event with a quality flag or drop with an explicit diagnostic; do not silently call it a complete turn.
- Populate main canonical token fields from `tokenUsage.total`:
  - `reported_input_tokens = total.inputTokens`
  - `reported_output_tokens = total.outputTokens`
  - `reported_total_tokens = total.totalTokens` when present, else input + output
  - `cache_read_input_tokens = total.cachedInputTokens`
  - `reasoning_output_tokens = total.reasoningOutputTokens`
  - `input_token_semantic = "gross_includes_cache"`
  - `usage_scope = "cumulative_snapshot"`
  - `snapshot_series_key = codex_thread:${threadId || runId}`
- Preserve `tokenUsage.last` as normalized provider-delta metadata in `raw_event_json`, not as the main accounting fields.
- Set latest prompt/current-context metadata from `last.inputTokens` and `modelContextWindow`:
  - `latest_prompt_tokens = last.inputTokens`
  - `effective_context_window_tokens = tokenUsage.modelContextWindow`
  - `context_window_usage_percent = last.inputTokens / modelContextWindow * 100`
- Use a stable idempotency key based on the cumulative snapshot identity, preferably:
  - provider event id if it is stable for replays and unique per snapshot, otherwise
  - `runId + threadId + turnId + total.inputTokens + total.cachedInputTokens + total.outputTokens + total.reasoningOutputTokens + total.totalTokens`.
- Preserve full provider params in `raw_event_json` for diagnosis and future reconciliation.

### Provider-delta reconciliation metadata

Add a small shared helper under the token-usage projection/domain area, for example:

`autobyteus-server-ts/src/token-usage/projections/cumulative-snapshot-reconciliation-metadata.ts`

Responsibilities:

- Define the existing source-token metadata key in one place:
  - `autobyteus_cumulative_snapshot_source_tokens`
- Define a new canonical provider-delta metadata key:
  - `autobyteus_cumulative_snapshot_provider_delta_tokens`
- Provide typed read/write helpers for the canonical token fields used by cumulative reconciliation.
- Keep the metadata provider-neutral. It must not contain Codex field names such as `inputTokens` or `cachedInputTokens`; Codex maps those into canonical snake_case token fields before storing the metadata.

The provider-delta metadata should be shaped around the same token-field names the normalizer already knows how to diff, for example:

```json
{
  "autobyteus_cumulative_snapshot_provider_delta_tokens": {
    "reported_input_tokens": 234630,
    "reported_output_tokens": 371,
    "reported_total_tokens": 235001,
    "cache_read_input_tokens": 233344,
    "reasoning_output_tokens": 166
  }
}
```

The implementation may either include component-resolved delta fields directly or derive them inside the shared projection using the same component-basis helper used by `TokenUsageComponentBasisResolver`. The design preference is to avoid duplicated gross/standard/cache math: if component-resolved baseline fields are needed, extract a pure reusable component-basis function and let both the resolver and cumulative-baseline logic use it.

### Snapshot delta normalizer behavior

Extend `autobyteus-server-ts/src/token-usage/projections/token-usage-snapshot-delta-normalizer.ts` rather than creating a Codex-only normalizer.

Target algorithm for `usage_scope = "cumulative_snapshot"`:

1. If idempotency key has already been normalized in this process, return the cached normalized result.
2. Require `snapshot_series_key`; if missing, clear cost-affecting fields and add `snapshot_series_key_missing`.
3. Find previous cumulative source snapshot by `run_id + snapshot_series_key` from the in-memory latest map or `TokenUsageLedgerStore.getLatestCumulativeSnapshot`.
4. Store current cumulative source fields under `autobyteus_cumulative_snapshot_source_tokens` before mutating fields into deltas.
5. If previous snapshot exists:
   - compute `current cumulative source - previous cumulative source` for each token field,
   - compare computed delta to provider-delta metadata if present,
   - prefer the cumulative total delta for accounting because it catches up if an intermediate provider update was received late or skipped by a process restart,
   - add `cumulative_snapshot_provider_delta_mismatch` if provider delta and computed delta differ materially.
6. If previous snapshot does not exist and provider-delta metadata exists:
   - use provider-delta metadata as the accounted delta,
   - add `first_cumulative_snapshot_baselined_from_provider_delta`,
   - store the current source snapshot as latest for future diffs.
7. If previous snapshot does not exist and provider-delta metadata is absent:
   - retain the existing generic behavior only for runtimes known to start cumulative counters at the run origin, with `first_cumulative_snapshot_assumed_run_origin`, or clear cost-affecting fields with a quality flag if the source is unsafe.
   - For Codex specifically, this state should be treated as anomalous because Codex normally provides `last`.
8. If any computed delta regresses below zero:
   - add `cumulative_snapshot_regressed`,
   - clear cost-affecting fields for that event,
   - preserve raw/source metadata.
9. Set `meter_delta_*` from the normalized accounting delta after reconciliation.

Quality flags to add/reuse:

- `first_cumulative_snapshot_baselined_from_provider_delta`
- `cumulative_snapshot_provider_delta_missing`
- `cumulative_snapshot_provider_delta_mismatch`
- `cumulative_snapshot_regressed`
- existing missing-field flags from canonical payload creation

## Codex Queue / Dispatch Design

Modify `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread.ts`:

- Replace accounting ownership by `pendingTurnTokenUsage: Map<string, CodexReadyTurnTokenUsage>` with an immutable usage-update queue or map keyed by idempotency key.
- Rename methods away from turn-final semantics:
  - `recordTurnTokenUsage(turnId, usage)` -> `recordTokenUsageUpdate(usage)` or similar.
  - `getReadyTurnTokenUsages()` -> `consumeReadyTokenUsageUpdates()` or `getReadyTokenUsageUpdates()`.
  - `markTurnTokenUsagePersisted(turnId)` -> `markTokenUsageUpdatePersisted(idempotencyKey)` if a separate mark step remains.
- Usage updates should be ready for dispatch immediately after the provider notification is received. Do not wait for `IDLE`/turn completion to avoid same-turn collapse.
- Keep turn lifecycle state (`activeTurnId`, `lastCompletedTurnId`, pending tools) separate from accounting state.

Modify `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-agent-run-backend.ts`:

- Emit every queued usage update as its own `AgentRunEventType.TOKEN_USAGE_UPDATED` event.
- Mark/consume by usage update id/idempotency key, not by `turnId`.
- Do not compute deltas in the backend bridge; pass canonical cumulative snapshot fields to the shared pipeline.

Modify `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-notification-handler.ts`:

- Continue reacting to every `thread/tokenUsage/updated` notification.
- Call the renamed usage-update recording method.
- Preserve full params/raw payload enough to support probe/debug evidence.

## Claude Agent SDK Design

Keep `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-token-usage.ts` as a terminal-result direct-delta adapter.

Target behavior:

- Continue emitting only for terminal `type=result` chunks.
- Continue `usage_scope: "per_turn"`.
- Do not use `snapshot_series_key`.
- Do not apply Codex cumulative-snapshot baseline/diff logic.
- Preserve both `result.usage` and `result.modelUsage` in `raw_usage_json` / `raw_event_json` as today.
- Add a diagnostic quality flag when both `usage` and selected/summed `modelUsage` are present and materially differ for token fields used by the mapper.
  - Suggested flag: `claude_usage_model_usage_mismatch`.
  - The accounting source remains current behavior (`usage` first, `modelUsage` fallback) unless a separate source-authority decision changes it.
- Add regression coverage for terminal result with `num_turns > 1` so future changes do not mistake SDK internal turns for multiple Autobyteus accounting rows.

## AutoByteus Native Runtime Design

No functional change is required for native AutoByteus LLM phase observations.

Guardrails:

- Native runtime observations should remain `usage_scope: "per_call"`.
- They should bypass cumulative snapshot diffing exactly as direct deltas.
- Add or retain tests that `TokenUsageSnapshotDeltaNormalizer` leaves `per_call` and `per_turn` payloads as direct deltas.

## Frontend Token Meter Design

Frontend should receive corrected backend summaries automatically after the backend accounting fix. Required frontend work is copy/label clarity, not accounting logic.

Target display semantics:

| Current Concept | Target User-Facing Meaning | Implementation Direction |
| --- | --- | --- |
| Current prompt | Latest prompt / current context size from the latest provider usage event | Rename label to `Latest prompt`; add tooltip defining that it is the latest provider prompt/current context snapshot, not a run total. |
| Gross input | Run input total | Label or tooltip as cumulative run total. |
| Cache hit | Run cache-read share: run cached input / run gross input | Tooltip should say it does not reset after compaction. |
| Output | Run output total | Label as run total. |
| Thinking | Run thinking/reasoning total | Label as run total and rely on corrected backend accounting. |
| Total estimate / cost | Run estimated API cost | Label as run total estimate. |

Potential copy:

- Rename `Current prompt` to `Latest prompt`. Tooltip: `Tokens in the latest provider prompt/current context snapshot. This value can change after compaction and is not a cumulative run total.`
- `Cache hit` tooltip: `Run-total cached input divided by run-total gross input. Compaction can reduce the latest prompt without resetting this cumulative rate.`
- Input/output/thinking cards tooltip: `Cumulative for this Autobyteus run.`

Out of scope unless product wants it later:

- A separate “latest request” mini-breakdown card.
- Recomputing cache rates in the frontend from raw provider JSON.

## Return Or Event Spine(s)

`Normalized TOKEN_USAGE_UPDATED -> TokenUsageEventPersistenceProcessor -> token usage ledger row -> run_summary_after_event / GraphQL summary -> frontend tokenUsageHandler -> tokenUsageMeterStore -> TokenUsageMeterPanel`

Rules:

- The return/event spine carries already-normalized server-accounted fields.
- Frontend stores/renderers may format and label, but must not reinterpret `raw_event_json`.
- If the frontend needs a field that is not present (for example explicit latest-request cache hit), add it to the server summary contract rather than deriving it from provider raw data in the UI.

## Bounded Local / Internal Spines

### Cumulative snapshot reconciliation inside `TokenUsageSnapshotDeltaNormalizer`

`Payload cumulative source fields -> previous/source baseline lookup -> provider-delta baseline/validation -> token field deltas -> regression/mismatch flags -> costable delta payload`

Parent owner: `TokenUsageSnapshotDeltaNormalizer`.

Why it matters: this local loop is the invariant that prevents duplicate charging, missed same-turn increments, and first-snapshot historical overcount.

### Codex thread usage update queue inside `CodexThread`

`Codex notification -> parsed usage update -> dedup/append by idempotency key -> consume ready update -> mark consumed`

Parent owner: Codex thread adapter.

Why it matters: this removes the turn-id map overwrite while keeping the runtime thread owner responsible for provider event intake.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Idempotency key construction | DS-002 | Codex adapter | Deduplicate replayed snapshots without dropping real cumulative advancements | Provider may not send stable ids | Duplicate costs or dropped usage. |
| Reconciliation metadata helper | DS-002, DS-005 | Snapshot normalizer | Carry provider delta in canonical names | Keeps shared normalizer provider-neutral | Codex raw parsing leaks into shared projection. |
| Quality flags | DS-001, DS-005 | Token usage projection | Make anomalous accounting visible | Allows safe degradation and diagnosis | Silent wrong cost/summary. |
| Claude divergence diagnostics | DS-003 | Claude adapter | Flag `usage` vs `modelUsage` mismatch | Production rows show divergence | Accidental source switch or invisible undercount. |
| UI labels/localization | DS-004 | Token Meter frontend | Clarify run total vs latest prompt | User confusion after compaction/high cache | Frontend becomes accounting owner. |
| Pricing enrichment | DS-001 | Token cost calculator | Price only normalized deltas | Existing cost owner | Overpricing cumulative totals. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Provider raw extraction | Runtime adapters | Extend | Already own provider protocol differences | N/A |
| Shared token shape | `TokenUsageUpdatedPayload` / `TOKEN_USAGE_UPDATED` | Reuse/tighten | Existing canonical boundary | N/A |
| Cumulative snapshot diff | `TokenUsageSnapshotDeltaNormalizer` | Extend | Already owns `usage_scope=cumulative_snapshot` behavior | N/A |
| Component basis math | `TokenUsageComponentBasisResolver` / token usage domain helpers | Reuse/extract pure helper if needed | Avoid duplicated gross/cache/standard policy | N/A |
| Token summary/UI | Ledger/store + Token Meter | Reuse with copy changes | Existing summary/display path | N/A |
| Runtime strategy selection | Canonical fields (`runtime_kind`, `ingestion_kind`, `usage_scope`) | No new registry now | The field contract is sufficient and clearer | A new registry would be empty indirection for this scope. |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| Codex runtime adapter | Codex protocol parse, total/last mapping, latest prompt, idempotency, usage queue | DS-002 | Codex backend | Modify | Main bug fix. |
| Shared token usage projection | Component basis, cumulative diff, baseline from provider delta, quality flags | DS-001, DS-005 | All runtimes | Modify | Provider-neutral extension. |
| Claude runtime adapter | terminal result direct-delta mapping, divergence diagnostics | DS-003 | Claude backend | Small modify / tests | No cumulative treatment. |
| AutoByteus native runtime | per-call observations | DS-003 | Native runtime | No functional change | Guard with tests if touched. |
| Token usage ledger/store | persistence and run summaries | DS-001, DS-004 | Backend API/live stream | Reuse | Historical backfill out of scope. |
| Token Meter frontend | labels/tooltips | DS-004 | UI | Modify | Presentation only. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `codex-thread-token-usage.ts` | Codex adapter | Codex usage parser | Parse total+last; emit cumulative snapshot fields and provider-delta metadata | Provider-specific field mapping belongs here | Yes |
| `codex-thread.ts` | Codex adapter | Codex thread runtime | Replace turn-id pending map with immutable usage-update queue | Runtime event intake/queue lives here | Yes |
| `codex-agent-run-backend.ts` | Codex backend | Dispatch bridge | Emit every queued usage update as a canonical event | Bridges thread to shared pipeline | Yes |
| `cumulative-snapshot-reconciliation-metadata.ts` | Token usage projection/domain | Metadata helper | Read/write provider-neutral source/delta metadata keys | Prevents string/shape duplication | Yes |
| `token-usage-snapshot-delta-normalizer.ts` | Token usage projection | Cumulative normalizer | First-baseline from provider delta; validation flags; regression handling | Existing cumulative owner | Yes |
| `claude-session-token-usage.ts` | Claude adapter | Claude SDK result parser | Add usage/modelUsage mismatch diagnostics only | Provider-specific parser | Yes |
| `TokenUsageMeterPanel.vue` + localization | Frontend | Presentation | Run-total/latest-prompt labels/tooltips | UI copy owner | No |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Cumulative source token field list and metadata keys | `cumulative-snapshot-reconciliation-metadata.ts` | Token usage projection | Source and provider-delta metadata are used by parser and normalizer | Yes | Yes | Codex-specific raw parser. |
| Component basis calculation for arbitrary token field sets | Existing token usage domain helper or extracted pure function | Token usage domain/projection | Avoid duplicating gross/cache/standard math in baseline handling | Yes | Yes | Kitchen-sink provider DTO. |
| Runtime semantics matrix | Explicit canonical fields | Runtime adapters + shared pipeline | Runtime differences are data contract, not UI logic | Yes | Yes | Empty strategy framework. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `reported_*` fields | Yes after adapter chooses scope: direct delta for `per_call/per_turn`, cumulative source for `cumulative_snapshot` before normalizer, delta after normalizer | Yes | Medium because same fields change from source to normalized delta | Preserve original cumulative source under `autobyteus_cumulative_snapshot_source_tokens`. |
| `snapshot_series_key` | Yes: identity of one cumulative counter series | Yes | Low | Codex must set it; direct deltas keep null. |
| provider-delta metadata | Yes: provider-reported delta for reconciliation | Yes | Medium if raw Codex fields leak through | Store canonical field names only. |
| `latest_prompt_tokens` | Yes: latest provider prompt/current context size | Yes | Low | Codex sets from `last.inputTokens`, not cumulative `total.inputTokens`. |
| `raw_event_json` | Yes: diagnostic raw/canonical metadata envelope | N/A | Medium if business logic parses provider keys there | Shared normalizer reads only Autobyteus-owned metadata keys. |

## Final File Responsibility Mapping

| File | Owning Subsystem | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-token-usage.ts` | Codex adapter | Parser | Build Codex cumulative snapshot usage updates from `tokenUsage.total`; canonicalize `tokenUsage.last` as provider-delta metadata; latest prompt from `last`; stable idempotency | Provider field mapping | Yes |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread.ts` | Codex adapter | Thread runtime | Replace `pendingTurnTokenUsage` accounting map with append-only/deduped usage update queue | Prevents same-turn overwrite | Yes |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-notification-handler.ts` | Codex adapter | Notification handler | Route every `thread/tokenUsage/updated` notification to the usage-update recorder | Existing notification boundary | Yes |
| `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-agent-run-backend.ts` | Codex backend | Dispatch bridge | Emit all queued usage updates; mark by idempotency key | Keeps one shared dispatch path | Yes |
| `autobyteus-server-ts/src/token-usage/projections/cumulative-snapshot-reconciliation-metadata.ts` | Token usage projection | Metadata helper | Shared constants/types/read-write helpers for cumulative source and provider-delta metadata | Avoid duplicated ad hoc raw JSON keys | Yes |
| `autobyteus-server-ts/src/token-usage/projections/token-usage-snapshot-delta-normalizer.ts` | Token usage projection | Normalizer | Use provider-delta metadata for first snapshot and validation; keep previous snapshot diff; quality flags | Existing cumulative owner | Yes |
| `autobyteus-server-ts/src/token-usage/projections/token-usage-component-basis-resolver.ts` and/or token usage domain helper | Token usage projection/domain | Component basis owner | Optionally extract reusable component-basis calculation to avoid duplicate baseline math | Existing component-basis owner | Yes |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-token-usage.ts` | Claude adapter | SDK parser | Add mismatch quality flag for `usage` vs `modelUsage`; keep `per_turn` direct | Provider field mapping | Yes |
| `autobyteus-server-ts/tests/...` | Test suite | Regression coverage | Codex same-turn updates, cumulative baseline, Claude direct-delta guardrails, frontend labels | Durable protection | Yes |
| `autobyteus-web/components/workspace/usage/TokenUsageMeterPanel.vue` | Frontend | Token Meter UI | Rename `Current prompt` label to `Latest prompt`; add tooltips for latest prompt, run-total cards, cache hit, output, and thinking | Presentation owner | Yes |
| `autobyteus-web/localization/messages/*/shell.ts` or current localization files | Frontend | Localization | User-facing copy for `Latest prompt` and run-total/cache-hit tooltips | Existing copy owner | Yes |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| `pendingTurnTokenUsage: Map<turnId, CodexReadyTurnTokenUsage>` as accounting storage | It collapses multiple same-turn updates | Codex usage-update queue keyed by idempotency key | In this change | Turn lifecycle state may remain separate. |
| `recordTurnTokenUsage` naming/semantics for Codex accounting | The accounting unit is a usage update/snapshot, not a completed turn | `recordTokenUsageUpdate` or equivalent | In this change | Rename tests/probes accordingly. |
| Codex `usage_scope: "per_turn"` when `last` exists | `last` is per provider update, not whole app turn | `usage_scope: "cumulative_snapshot"` sourced from `total` | In this change | Only fallback direct-delta with explicit flag if no total. |
| Shared normalizer first-snapshot assumption for Codex | Codex cumulative totals include historical thread totals | Provider-delta baseline metadata | In this change | Generic assume-origin behavior may remain for safe sources. |
| Frontend ambiguity that cache/input/output cards are all the same kind of number | Users confuse run totals with latest prompt after compaction | Copy/tooltips | In this change | No frontend accounting. |

## Dependency Rules

Allowed:

- Runtime adapters may import shared token usage domain types/helpers needed to build canonical observations.
- Shared token usage projection may depend on ledger store lookup for previous cumulative snapshots.
- Frontend may depend on GraphQL/live token summary fields.

Forbidden:

- Frontend parsing `raw_event_json.tokenUsage` or Claude raw payloads for accounting.
- `TokenUsageSnapshotDeltaNormalizer` depending on Codex protocol field names.
- Codex adapter computing final run totals or costs.
- Any Codex accounting map keyed only by `turnId` when multiple provider usage updates can share the same turn.
- Applying cumulative snapshot diffing to `per_call`/`per_turn` events.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `resolveCodexThreadTokenUsage` | Codex usage update/snapshot | Convert raw Codex params into canonical cumulative snapshot event data | `runId + threadId + turnId + params` | Preserve total+last. |
| `CodexThread.recordTokenUsageUpdate` (new/renamed) | Codex usage update queue | Queue/dedup provider usage updates for dispatch | `idempotency_key` / usage update object | Not keyed only by turn id. |
| `TokenUsageSnapshotDeltaNormalizer.normalizeAccountingDelta` | Accounting delta | Convert cumulative source snapshots into costable deltas; direct pass-through for direct scopes | `run_id + snapshot_series_key + idempotency_key` | Provider-neutral. |
| `buildClaudeTokenUsageEvent` | Claude terminal result usage | Convert SDK terminal result into direct per-turn event and diagnostics | `runId + sessionId + turnId + model + chunk` | No cumulative snapshot. |
| Token usage summary GraphQL/live API | Run usage summary | Expose run totals and latest prompt fields | `runId` plus team/member context from summary | No provider-specific UI math. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Current `recordTurnTokenUsage` | No | Partial | High | Rename/replace to usage-update recording keyed by event/snapshot identity. |
| Current `resolveCodexThreadTokenUsage` | Partially | Yes | Medium | Change selected source from `last` to `total`; preserve `last` as metadata. |
| `TokenUsageSnapshotDeltaNormalizer` | Yes | Yes | Low | Extend first-baseline behavior via canonical metadata. |
| `buildClaudeTokenUsageEvent` | Yes | Yes | Low | Add mismatch diagnostics without changing scope. |
| Token summary query/store | Yes | Yes | Low | Keep; add labels/tooltips in UI. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Codex usage object | `CodexReadyTurnTokenUsage` -> `CodexReadyTokenUsageUpdate` / `CodexTokenUsageSnapshot` | Proposed yes | High if `Turn` remains | Rename away from turn-final semantics. |
| Codex queue method | `recordTurnTokenUsage` -> `recordTokenUsageUpdate` | Proposed yes | High if old name remains | Rename in implementation/tests. |
| Provider delta metadata | `autobyteus_cumulative_snapshot_provider_delta_tokens` | Yes | Low | Centralize constant/helper. |
| UI current prompt label | `Current prompt` -> `Latest prompt` or tooltip | Yes | Medium | Clarify latest/current vs run total. |

## Applied Patterns

- Adapter: runtime-specific raw provider extraction before the shared boundary.
- Append-only/deduped event queue: Codex usage updates are immutable accounting candidates.
- Cumulative snapshot delta normalization: provider cumulative totals become costable deltas.
- Quality-flag diagnostics: anomalous source relationships are visible without inventing values.
- Authoritative boundary: frontend depends on ledger summaries, not provider raw internals.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/` | Folder | Codex thread adapter | Codex notification parsing, thread lifecycle, usage update queue | Existing Codex runtime boundary | Shared cost/delta policy. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/backend/` | Folder | Codex run backend bridge | Convert queued Codex updates to `AgentRunEvent`s | Existing dispatch bridge | Provider-independent accounting math. |
| `autobyteus-server-ts/src/token-usage/projections/` | Folder | Shared token usage projection | Component basis, snapshot delta, reconciliation helpers | Existing shared projection capability area | Runtime protocol parsers. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/` | Folder | Claude session adapter | SDK result mapping and diagnostics | Existing Claude provider boundary | Codex cumulative diff behavior. |
| `autobyteus-web/components/workspace/usage/` | Folder | Token Meter UI | Present summaries and labels | Existing UI owner | Provider raw parsing/accounting. |

## Folder Boundary Check

- The target change reuses existing capability folders; no broad new module grouping is needed.
- The only suggested new file is a small provider-neutral cumulative-snapshot metadata helper under `token-usage/projections/` because the metadata keys and field list otherwise repeat across parser and normalizer.
- Do not place Codex-specific helpers under shared `token-usage` unless they are provider-neutral. Codex raw field parsing stays in the Codex adapter.

## Concrete Examples / Shape Guidance

### Codex first snapshot baseline

Raw provider shape:

- `tokenUsage.total.inputTokens = 6,750,757`
- `tokenUsage.total.cachedInputTokens = 6,736,127` (example cumulative cache source)
- `tokenUsage.total.outputTokens = 12,000`
- `tokenUsage.last.inputTokens = 234,630`
- `tokenUsage.last.cachedInputTokens = 233,344`
- `tokenUsage.last.outputTokens = 371`
- `tokenUsage.last.reasoningOutputTokens = 166`

If this is the first snapshot for the Autobyteus run/thread, do **not** charge `6,750,757` input tokens. Account the provider-delta metadata from `last`: `234,630` gross input, `233,344` cache read, `371` output, `166` reasoning, with `first_cumulative_snapshot_baselined_from_provider_delta`.

### Codex later snapshot catch-up

Previous stored source snapshot:

- `total.inputTokens = 6,750,757`

Current snapshot:

- `total.inputTokens = 7,989,485`
- provider `last.inputTokens = 39,781`

Computed cumulative delta is `1,238,728`. If provider `last` is only `39,781`, flag `cumulative_snapshot_provider_delta_mismatch` and use the cumulative delta for accounting because it catches up skipped/collapsed intermediate updates. This is exactly why `total` is the preferred accounting source after a previous snapshot exists.

### Claude terminal result with internal SDK loop

Raw SDK terminal result may report `num_turns=3` and `usage.input_tokens=205`, `usage.cache_read_input_tokens=44800`, `usage.output_tokens=219`. Autobyteus should emit one `per_turn` usage event for the app turn:

- `standard_input_tokens = 205`
- `cache_read_input_tokens = 44800`
- `accounting_input_tokens = 45005` after component-basis resolution
- no `snapshot_series_key`
- no cumulative diff

### AutoByteus native LLM call

An LLM phase observation for one call remains one `per_call` direct delta. It should pass through the snapshot normalizer unchanged except for `meter_delta_*` assignment.

## Backward-Compatibility Rejection Log (Mandatory)

| Compatibility Option Rejected | Why Rejected | Clean-Cut Replacement |
| --- | --- | --- |
| Keep `pendingTurnTokenUsage` and accumulate `last` values inside the map | Still makes turn id the accounting slot and is fragile across missed/replayed events | Use cumulative snapshots plus usage-update queue. |
| Frontend-only correction or alternate cache-rate formula | Backend ledger would remain wrong; output/thinking undercount persists | Fix backend accounting and clarify frontend copy. |
| Apply Codex cumulative logic to Claude because both are external runtimes | Live Claude evidence shows terminal direct deltas; cumulative diff would be wrong | Keep explicit runtime semantics via `usage_scope`. |
| Introduce broad runtime strategy registry now | Existing canonical fields already express the needed strategy; registry would be empty indirection | Tighten adapter contract and shared projection helpers. |
| Charge whole first Codex cumulative snapshot | Overcounts historical provider thread totals | Use provider `last` as first baseline. |

## Derived Layering (If Useful)

This design can be understood as layers, but ownership is the deciding rule:

1. Runtime adapter layer: provider raw interpretation.
2. Token usage projection layer: canonical component/delta/cost semantics.
3. Persistence/API layer: durable ledger and summaries.
4. Frontend layer: presentation only.

Higher layers must not bypass lower authoritative owners. In particular, the frontend must not skip the server projection and inspect provider raw payloads.

## Migration / Refactor Sequence

1. Add/centralize cumulative-snapshot reconciliation metadata helper and tests for reading/writing canonical provider-delta tokens.
2. Extend `TokenUsageSnapshotDeltaNormalizer` for provider-delta first baseline and provider-delta mismatch validation.
3. Update Codex parser to emit `cumulative_snapshot` fields from `tokenUsage.total`, canonical provider-delta metadata from `tokenUsage.last`, latest prompt from `last.inputTokens`, and snapshot-series/idempotency identity.
4. Replace Codex turn-id pending accounting map with immutable/deduped usage-update queue.
5. Update Codex backend dispatch to emit/consume every queued usage update by idempotency key.
6. Add Claude `usage` vs `modelUsage` mismatch quality flag, if included in implementation scope, without changing source selection.
7. Update frontend copy/tooltips for run-total/latest-prompt semantics.
8. Run focused backend tests, frontend tests for changed copy/component behavior, and any existing token-usage regression suite.
9. Leave historical undercounted ledger rows unchanged unless a separate backfill task is approved.

## Test / Coverage Design

Backend unit/integration tests should cover:

- Codex parser:
  - `tokenUsage.total` becomes main cumulative fields.
  - `tokenUsage.last` becomes provider-delta metadata and latest prompt source.
  - idempotency key is stable for duplicate/replayed snapshots.
  - missing `total` is flagged and not silently treated as whole-turn usage.
- Codex thread queue:
  - three same-turn usage updates produce three queued/consumable usage events or deduped unique snapshots, not one overwritten row.
- Snapshot normalizer:
  - first Codex snapshot with provider delta accounts provider delta, not cumulative source.
  - later snapshot uses total delta.
  - later snapshot mismatch with provider delta flags mismatch and uses total delta.
  - regression clears cost-affecting fields and flags.
  - direct `per_call`/`per_turn` payloads pass through unchanged.
- End-to-end backend pipeline:
  - Codex multi-update turn accumulates input/cache/output/reasoning across all updates.
  - pricing uses normalized deltas, not cumulative totals.
- Claude adapter:
  - terminal result with `num_turns > 1` emits one `per_turn` event.
  - `usage`/`modelUsage` mismatch is preserved and flagged.
- Frontend:
  - visible labels/tooltips distinguish run totals from latest prompt/current context, including the `Latest prompt` label replacing `Current prompt`.
  - no frontend raw-provider accounting is introduced.

Probe scripts in the ticket directory may remain as investigation artifacts; durable tests should live in the repository test suite rather than depending on live provider access.

## Key Tradeoffs

- Using Codex `total` as accounting source after first baseline is safer than summing every `last` in process because it can catch up after missed intermediate updates or process restarts.
- Using `last` for first baseline avoids overcounting historical thread totals that predate the Autobyteus run/snapshot series.
- Keeping Claude as direct `per_turn` avoids a false fix based on a different runtime shape.
- Label-only frontend work avoids moving accounting responsibility into the UI while still addressing user confusion.
- Adding a metadata helper is justified because it keeps shared normalizer logic provider-neutral; adding a broad runtime strategy registry is not justified for this scope.

## Risks

- First-snapshot baseline implementation can overcount if provider-delta metadata is missing or incorrectly mapped. Mitigation: explicit flags and Codex tests.
- Idempotency can either double-count or drop real updates if the key is too narrow. Mitigation: include cumulative token tuple and thread/run identity when provider id is not reliable.
- Existing historical Codex rows remain undercounted. Mitigation: document out-of-scope backfill.
- Claude `usage` vs `modelUsage` source authority remains unresolved. Mitigation: preserve raw data and add mismatch diagnostics; defer source switch to a focused decision.
- UI users may still expect compaction to reset cumulative totals. Mitigation: copy/tooltips say run totals do not reset and latest prompt updates on provider usage events.

## Guidance For Implementation

- Keep provider-specific raw parsing in runtime adapters only.
- Keep accounting deltas and quality flags in the shared token-usage projection.
- Prefer renaming Codex types/methods over preserving misleading `TurnTokenUsage` names.
- Do not add compatibility fallbacks that keep old Codex `per_turn`/turn-map behavior alive.
- Use canonical snake_case token field names for shared metadata.
- Preserve full raw provider payloads for forensic debugging, but do not let downstream code depend on provider raw field names.
- If a needed frontend display field is absent from server summaries, extend the server summary contract rather than parsing raw events in the frontend.

## User Review Note

This design is intentionally stopped at `Draft for user review`. It has not been sent to `architecture_reviewer` per user instruction.
