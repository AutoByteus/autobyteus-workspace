# Requirements Doc

- Ticket: `codex-token-cache-rate-statistics`
- Last Updated: `2026-06-28`

## Status (`Draft`/`Design-ready`/`Refined`)

Refined

## Goal / Problem Statement

Investigate and correct runtime token statistics in Autobyteus Token Meter, starting from a suspicious Codex app-server cache-hit rate (`99.8%` on `208,212` gross input tokens with only `468` uncached tokens) and extending to whether Claude Agent SDK has a similar token-accounting failure.

Live Codex experiments proved that near-100% prompt-cache rates are realistic for long stable prefixes, so the Codex cache-rate formula itself is not the bug. The confirmed Codex bug is event accounting: Codex can send multiple `thread/tokenUsage/updated` notifications during a multi-call/tool-heavy turn, each notification contains cumulative counters (`tokenUsage.total`) and per-update increments (`tokenUsage.last`), and Autobyteus currently buffers usage by `turnId` in a way that can overwrite earlier same-turn increments before persistence.

Live Claude Agent SDK experiments did **not** reproduce the same overwrite/cumulative bug. Claude SDK emits one terminal `result` usage/modelUsage payload per app turn, even when the SDK result reports `num_turns=3` for an internal tool loop. Autobyteus emits one `TOKEN_USAGE_UPDATED` and one ledger row per terminal result. However, production samples show a separate Claude source-selection risk: `result.usage` and `result.modelUsage` can diverge, and the current mapper prefers `usage` when present. The design should keep the Codex fix targeted while preserving/flagging Claude raw `usage` vs `modelUsage` divergence for follow-up if needed.

## Investigation Findings

### Cache-hit rate finding

- The screenshot-like `99.8%` cache rate is not fabricated by Token Meter arithmetic.
- The screenshot-matching SQLite ledger row stores raw Codex app-server `tokenUsage.last` with `inputTokens=208212` and `cachedInputTokens=207744`; the displayed rate is `207744 / 208212 = 99.775%`.
- Live Codex app-server probes reproduced the pattern:
  - first unique long prompt mostly uncached (`4.3%` / `8.2%` cache),
  - repeated stable-prefix turns jump to `99.3%`-`99.9%`,
  - adding a large novel suffix drops to ~`85%`,
  - the next short turn recovers to `99.8%`-`99.9%`.
- Conclusion: high cache-hit rates are valid provider-reported prompt-cache reuse when a long stable prefix dominates a tiny new suffix.

### Confirmed Codex accounting bug

- `tokenUsage.total` is cumulative for the Codex thread; `tokenUsage.last` is the latest provider update increment.
- Full-capture live probe evidence showed consecutive captured updates satisfy `current total - previous total = current last` for all comparable fields (`inputTokens`, `cachedInputTokens`, `outputTokens`, `reasoningOutputTokens`, `totalTokens`) with `7/7` matches and `0` mismatches.
- Current code path:
  1. `resolveCodexThreadTokenUsage` selects `tokenUsage.last` and marks it as `usage_scope: "per_turn"`.
  2. `CodexThread.recordTurnTokenUsage(turnId, usage)` stores it in `pendingTurnTokenUsage: Map<turnId, usage>`.
  3. If the turn is still active, the usage is not dispatched until idle/completion.
  4. Additional same-turn updates call `pendingTurnTokenUsage.set(turnId, usage)` again, overwriting the earlier pending update.
- Live gpt-5.5 probe confirmed the overwrite:
  - `recordTurnTokenUsage` calls: `4`,
  - websocket/ledger `TOKEN_USAGE_UPDATED` rows: `2`,
  - tool-heavy turn received three same-turn updates, but only the final update was persisted/emitted.
- In the full-capture rerun, same-turn increments were `input/output = 11050/89`, `11200/89`, and final `11349/32`; only final `11349/32` reached the ledger/UI.
- This explains why thinking tokens can appear too small: `reasoningOutputTokens` is cumulative in `tokenUsage.total`, but earlier same-turn `last.reasoningOutputTokens` increments can be overwritten before persistence.

### Claude Agent SDK comparison finding

- Claude Agent SDK token accounting is terminal-result based: `ClaudeSession` iterates SDK chunks and emits token usage only from terminal `type=result` chunks with `usage`/`modelUsage`.
- Live controlled probe with three app turns, including one turn that forced Bash tool use and produced SDK `num_turns=3`, observed:
  - raw SDK chunks: `153`,
  - terminal result chunks: `3`,
  - usage-bearing raw chunks: `3`,
  - websocket `TOKEN_USAGE_UPDATED` messages: `3`,
  - persisted ledger rows: `3`,
  - all usage scopes: `per_turn`,
  - no `usage` vs `modelUsage` token deltas in that live run.
- Therefore Claude does not currently show the Codex-specific same-turn overwrite problem: there are not multiple usage-bearing SDK updates competing for one pending `turnId` slot.
- Separate Claude risk: two local production rows had `result.modelUsage` totals higher than `result.usage` (`+1133 input/+88 output` and `+444 input/+427 output`). Current mapper chooses `usage` first and preserves `modelUsage` only in `raw_event_json`. This is not the same bug as Codex, but it should be documented/flagged and may need a future source-authority decision if provider invoices or SDK docs indicate `modelUsage` is more complete.

### Shared normalization architecture finding

- Runtime adapters convert provider-specific usage into a common `TOKEN_USAGE_UPDATED` event payload.
- `TokenUsageEventEnrichmentTransformer` then applies the shared server pipeline:
  1. `createTokenUsageUpdatedPayload` canonicalizes fields and raw JSON,
  2. `TokenUsageContextEnricher` adds run/team/member context,
  3. `TokenUsageComponentBasisResolver` converts input/cache semantics into gross/standard/cache buckets,
  4. `TokenUsageSnapshotDeltaNormalizer` converts `cumulative_snapshot` rows into deltas while treating `per_call` and `per_turn` as direct deltas,
  5. `TokenCostCalculator` prices the normalized component basis,
  6. `TokenUsageEventPersistenceProcessor` appends the enriched event asynchronously.
- Frontend Token Meter is downstream of this normalized server event/ledger path and should not implement provider-specific delta logic.

### Correct solution direction

- Backend must treat Codex usage updates as the accounting unit, not completed turns.
- Preferred Codex accounting source: `tokenUsage.total` cumulative snapshots, converted to deltas by comparing against the previous snapshot for the same run/thread.
- `tokenUsage.last` should be preserved as:
  - the first-snapshot baseline (`first delta = last`, so historical cumulative totals are not overcounted),
  - a validation field (`total delta` should equal `last` when no intermediate update is skipped),
  - latest request metadata source for current prompt/context display.
- Claude should remain terminal-result/per-turn unless future evidence proves a cumulative or multi-update SDK usage stream. Add or keep diagnostics for `usage` vs `modelUsage` divergence rather than applying the Codex total-delta design to Claude.
- Frontend must not compute provider deltas; it should display corrected backend summaries and clarify labels.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix plus runtime-comparison investigation and small UX clarity improvement
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes for Codex multi-update usage accounting; no for the cache-hit division itself; no confirmed Codex-like issue for Claude Agent SDK.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Local Implementation Defect plus Missing Invariant for Codex: every provider usage increment must be accounted exactly once. Claude has a possible source-authority/diagnostic gap around `usage` vs `modelUsage`, but not the same overwrite defect.
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed in Codex token usage ingestion. Claude code change is deferred unless the design intentionally adds divergence flags/diagnostics.
- Evidence basis: Matching production rows; live Codex cache-rate probes; live Codex accounting probes; full normalized usage capture; total-vs-last relationship report; Codex production total-vs-last sample; live Claude terminal-result/tool-loop probe; Claude production `usage` vs `modelUsage` sample.
- Requirement or scope impact: Implementation should update backend Codex token ingestion and token usage normalization. Frontend should receive corrected summaries automatically, with copy/label improvements to distinguish run totals from latest request. Claude should be protected by regression coverage/diagnostics but should not receive a Codex-style cumulative-delta change without more evidence.

## Recommendations

1. Do **not** change the cache-hit formula just because `99%+` looks high.
2. Do fix Codex usage ingestion so multiple same-turn token-usage updates cannot overwrite one another.
3. Prefer Codex cumulative `tokenUsage.total` delta accounting because it can catch up if an intermediate update is missed.
4. Preserve `tokenUsage.last` and raw provider payloads for diagnostics, latest-request display, initial-baseline handling, and total-vs-last validation flags.
5. Do not apply the Codex fix wholesale to Claude Agent SDK. Claude live evidence supports one per-turn terminal result usage event.
6. Preserve and, if feasible, flag Claude `usage` vs `modelUsage` divergence because local production data shows they can differ.
7. Update Token Meter copy/labels so the UI communicates:
   - run-total input/output/thinking/cost,
   - latest prompt/context size,
   - cache hit as run-total cached input / run-total gross input.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

## In-Scope Use Cases

- UC-001: User opens Token Meter for a live Codex app-server run and sees prompt-cache/input-token statistics.
- UC-002: User inspects current prompt utilization and estimated API price for a Codex provider turn/run.
- UC-003: Backend records and exposes provider token usage for Codex provider events.
- UC-004: Codex performs a multi-call/tool-heavy turn and emits multiple same-turn usage updates.
- UC-005: User interprets Token Meter after compaction and needs to distinguish cumulative run totals from latest prompt size.
- UC-006: Backend records and exposes Claude Agent SDK terminal result usage, including SDK internal tool loops, without applying Codex-specific cumulative logic.

## Out of Scope

- Changing Codex or Claude provider behavior or real prompt-cache/KV-cache semantics.
- Repricing every provider unless shared pricing code is affected by the Codex accounting fix.
- Full Token Meter visual redesign beyond labels/tooltips and optional latest-request clarification.
- Historical ledger backfill, unless explicitly included in implementation scope. Forward correctness is mandatory; historical repair may be follow-up.
- Resolving Claude provider invoice reconciliation or replacing `usage` with `modelUsage` as authoritative without a focused follow-up decision.

## Functional Requirements

- REQ-001: Token Meter must continue computing cache-hit percentage from semantically correct raw usage fields: cached input divided by gross input, where the accounting values are correctly normalized deltas/totals.
- REQ-002: Token Meter must not infer cache hits from aggregation, compaction boundary, context limit, or missing usage fields.
- REQ-003: Backend provider usage capture must preserve raw Codex usage data that distinguishes `tokenUsage.total`, `tokenUsage.last`, gross input, cached input, uncached input, output, reasoning output, and context window.
- REQ-004: UI must represent unknown or unavailable cache data explicitly and should clarify that high positive cache rates are provider-reported prompt-cache reads when raw cache fields exist.
- REQ-005: Codex token usage accounting must account every provider usage increment exactly once, including multi-call/tool-loop turns and compaction-related model calls when Codex reports them.
- REQ-006: Codex same-turn usage updates must not be stored in a single accounting map entry keyed only by `turnId` when that can overwrite earlier updates.
- REQ-007: Codex cumulative `tokenUsage.total` snapshots must be reconciled into accounting deltas per run/thread; first snapshot handling must use `tokenUsage.last` as the baseline delta rather than charging the whole historical thread total.
- REQ-008: The system must preserve and expose quality/diagnostic information when cumulative counters regress, when `total` delta differs from `last`, when first-snapshot baseline is unavailable, or when usage data is otherwise unreconciled.
- REQ-009: Output tokens and reasoning/thinking tokens must be accumulated using the same exactly-once accounting model as input/cache tokens.
- REQ-010: Frontend Token Meter must display corrected backend summaries without provider-specific client-side accounting.
- REQ-011: Frontend labels/tooltips must distinguish cumulative run totals from latest request/current prompt metrics.
- REQ-012: Durable regression coverage must be expanded for Codex total-vs-last semantics, same-turn multi-update accounting, reasoning-token accounting, and frontend label/summary expectations if UI copy changes.
- REQ-013: Claude Agent SDK usage accounting must remain terminal-result/per-turn based unless captured SDK data shows a cumulative or multi-update usage stream.
- REQ-014: Claude Agent SDK mapping must preserve both `result.usage` and `result.modelUsage` raw data, and should flag or otherwise make diagnosable cases where their token totals diverge.
- REQ-015: Runtime-specific token mapping must stay in runtime adapters/normalizers before the shared `TOKEN_USAGE_UPDATED` enrichment pipeline; frontend and shared projections must not parse raw provider payloads.

## Acceptance Criteria

- AC-001: Given a Codex usage payload with explicit cached and uncached input token counts, computed cache-hit percentage equals `cache_read_input_tokens / gross_input_tokens` using correctly accounted values.
- AC-002: Given a Codex usage payload with missing cache-token fields, the system does not display an inferred high cache-hit percentage; it displays unknown/no-cache-data or excludes the percentage from a complete estimate.
- AC-003: Given the screenshot-like Codex run, investigation and implementation trace the displayed cache-hit value to exact source fields and do not treat valid 99%+ prompt-cache reuse as a defect.
- AC-004: Given consecutive Codex usage updates where `tokenUsage.total` advances and `tokenUsage.last` is present, the accounted delta equals the cumulative total movement and matches `last` when no intermediate update is skipped.
- AC-005: Given multiple Codex `thread/tokenUsage/updated` notifications for one active `turnId`, every received usage increment is persisted/accounted or cumulative total deltas catch up to include it; no earlier same-turn update is lost by overwrite.
- AC-006: Given output and reasoning/thinking increments across multiple same-turn updates, run summary output and thinking totals include all increments, not only the final update.
- AC-007: Given the first Codex usage snapshot for a run/thread where cumulative `total` includes historical provider state, the accounting delta uses `last` or an equivalent baseline mechanism and does not charge the whole historical cumulative total.
- AC-008: Given duplicate or replayed Codex cumulative snapshots, the system does not double-count usage.
- AC-009: Given regressed/malformed/missing cumulative counters, the system emits explicit quality flags and avoids silently producing fabricated complete cost estimates.
- AC-010: Pricing estimates continue to use the correct discounted-vs-full-price input buckets and output/reasoning buckets after the Codex accounting fix.
- AC-011: Token Meter UI clearly indicates which displayed values are run totals and which value is latest/current prompt context; compaction should not appear to “fail” merely because cumulative run totals do not reset.
- AC-012: Regression coverage exists at the narrowest durable backend boundary and, where copy changes, at the frontend component/store boundary.
- AC-013: Given a Claude Agent SDK terminal `result` with `num_turns > 1`, the backend emits one `per_turn` usage event for the terminal result and persists exactly one corresponding ledger row.
- AC-014: Given a Claude Agent SDK terminal `result` where `usage` and `modelUsage` differ, raw payloads preserve both sources and diagnostics make the divergence reviewable.
- AC-015: Given any runtime-specific usage event, provider-specific field extraction happens before the shared enrichment pipeline and the frontend receives only normalized server-accounted fields.

## Constraints / Dependencies

- Must work from dedicated task worktree `codex/codex-token-cache-rate-statistics` based on latest `origin/personal`.
- Must avoid relying on provider behavior assumptions without checking captured raw usage/event data.
- Must keep authoritative usage parsing/normalization in backend owners; avoid UI-only correction if backend fields are wrong.
- Must preserve raw provider usage payloads enough for diagnostics and future reconciliation.
- Must avoid backward-compatible dual accounting paths that keep old undercount behavior alive.

## Assumptions

- Codex app-server `tokenUsage.total` is cumulative per Codex thread, and `tokenUsage.last` is the latest provider update increment. This is supported by live probes and production samples.
- Near-100% cache rates are suspicious only on first unique prompts; they are realistic on long stable-prefix Codex and Claude Agent SDK turns.
- Claude Agent SDK `result.usage` is intended as terminal result usage, while `modelUsage` is a per-model breakdown/cost source; live probe showed equality, but production rows show divergence that needs diagnostics.
- Frontend can remain mostly presentation-only because backend summaries are the authoritative accounting source.

## Risks / Open Questions

- Resolved: Codex usage capture owner is `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-token-usage.ts` and related Codex thread/backend dispatch files.
- Resolved: Token Meter projection/ledger is backend-owned; frontend formats server-accounted values.
- Resolved: Raw provider usage events for the screenshot run are persisted locally and match the high cache-rate lineage.
- Resolved: `tokenUsage.total`/`tokenUsage.last` relationship has been verified in live Codex probes; mismatches in production persisted rows are evidence of skipped/collapsed intermediate updates.
- Resolved: Claude Agent SDK live probe did not reproduce a Codex-like same-turn overwrite bug; terminal results, websocket events, and ledger rows matched 1:1.
- Risk: First Codex cumulative snapshot baseline must avoid overcounting historical provider totals.
- Risk: Historical Codex rows are already undercounted; backfill/repair decision is separate.
- Risk: If Codex emits cumulative snapshots without stable event ids, idempotency must be derived carefully from thread/turn/counter tuple to avoid double-counting or dropping real updates.
- Risk: Claude production rows show `usage` vs `modelUsage` divergence; this investigation has not proven which source should be authoritative for every SDK/version/model case.
- Remaining external risk: This verifies app-server/SDK reported usage behavior, not final provider invoice reconciliation.

## Requirement-To-Use-Case Coverage

| Requirement | Use Cases |
| --- | --- |
| REQ-001 | UC-001, UC-002, UC-003, UC-006 |
| REQ-002 | UC-001, UC-002 |
| REQ-003 | UC-003, UC-004 |
| REQ-004 | UC-001, UC-002, UC-005 |
| REQ-005 | UC-003, UC-004 |
| REQ-006 | UC-003, UC-004 |
| REQ-007 | UC-003, UC-004 |
| REQ-008 | UC-003, UC-004, UC-006 |
| REQ-009 | UC-001, UC-002, UC-003, UC-004, UC-006 |
| REQ-010 | UC-001, UC-002, UC-005, UC-006 |
| REQ-011 | UC-001, UC-002, UC-005 |
| REQ-012 | UC-001, UC-002, UC-003, UC-004, UC-005, UC-006 |
| REQ-013 | UC-006 |
| REQ-014 | UC-006 |
| REQ-015 | UC-003, UC-004, UC-006 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| AC-001 | Verifies correct positive path for cache-hit math after accounting normalization. |
| AC-002 | Verifies missing/unknown cache data cannot become an artificial near-100% hit rate. |
| AC-003 | Protects valid high prompt-cache reuse from being “fixed” incorrectly. |
| AC-004 | Verifies provider `total`/`last` relationship and cumulative delta accounting. |
| AC-005 | Verifies intra-turn Codex usage updates cannot be collapsed/lost. |
| AC-006 | Verifies output and thinking totals accumulate across multi-update turns. |
| AC-007 | Verifies first-snapshot cumulative baseline does not overcount history. |
| AC-008 | Verifies duplicate/replayed snapshots do not double-count. |
| AC-009 | Verifies malformed/regressed snapshots are explicitly flagged. |
| AC-010 | Verifies cost buckets remain correct after accounting fix. |
| AC-011 | Verifies UI clarity for run-total vs latest prompt behavior. |
| AC-012 | Verifies durable regression coverage for backend and frontend changes. |
| AC-013 | Verifies Claude tool-loop terminal result semantics do not get a Codex-style fix unnecessarily. |
| AC-014 | Verifies Claude `usage`/`modelUsage` divergence remains auditable. |
| AC-015 | Verifies runtime-normalizer/shared-pipeline/frontend boundary separation. |

## Approval Status

Requirements are refined and ready for design/architecture review. Implementation should proceed only after design review confirms the Codex cumulative-delta accounting shape, Claude diagnostic/source-selection scope, and frontend label scope.
