# Token Usage Collection And Storage Design Spec

## Status

Revised after architecture review round 1. User approved sending the no-legacy design direction; this revision resolves AR-001 through AR-004 before architecture review round 2. Implementation remains blocked until architecture review passes.

## Current-State Read

AutoByteus currently has three relevant runtime families:

- `autobyteus`: native AutoByteus LLM/API runtime in `autobyteus-ts`.
- `codex_app_server`: Codex App Server runtime in `autobyteus-server-ts/src/agent-execution/backends/codex`.
- `claude_agent_sdk`: Claude Agent SDK runtime in `autobyteus-server-ts/src/agent-execution/backends/claude`.

Current token usage capture is fragmented:

- Native AutoByteus LLM providers map provider usage into `CompleteResponse.usage`, but persistence depends on optional `TokenUsagePersistenceProcessor` and misses non-final LLM phases such as tool-intent model calls.
- Codex receives `thread/tokenUsage/updated`, parses it into `CodexThread` in-memory ready-turn usage, but latest backend does not persist or emit it.
- Claude Agent SDK iterates query chunks and knows terminal `result` chunks, but current code does not extract SDK result `usage` / `modelUsage` into platform token accounting.
- Existing durable storage is old `token_usage_records`, which is optional, lossy, role-split, and not a unified meter/accounting record.
- Native `CompleteResponse.usage` currently uses `TokenUsage` (`prompt_tokens`, `completion_tokens`, `total_tokens`, optional cost), so raw/cache/reasoning/provider details are already lost before server-side storage can see them. OpenAI-compatible and Anthropic adapters both map provider usage into this lossy shape.
- Shared `TokenPricingConfig` currently defaults omitted prices to `0.0`, and local provider discovery (Ollama/LMStudio) also registers zero pricing. This is not a trusted-free price; target pricing needs explicit trust status.
- Run/team identity already exists in `AgentRunContext.config` and `MemberTeamContext`, but current frontend team event mapping flattens identity only for transport display. Token ledger identity must be enriched server-side before persistence.
- Codex token usage parsing currently uses `tokenUsage.last ?? tokenUsage.total` and returns the same `TokenUsage` shape either way. Target accounting must retain whether the source was a direct turn delta or a cumulative snapshot.

Current convergence point for all runtimes is the server `AgentRunEvent` pipeline:

```text
runtime-specific events -> runtime backend/converter -> AgentRunEvent -> AgentRunEventPipeline -> listeners/frontend/history/team multiplexing
```

That event boundary is the correct place to unify token usage collection.

## Intended Change

Introduce a normalized `TOKEN_USAGE_UPDATED` agent-run event and a server-owned append-only token usage storage model.

High-level target:

```text
Runtime-specific token source
  -> TOKEN_USAGE_UPDATED AgentRunEvent
  -> server price/cost enrichment
  -> live frontend Usage/Token Meter event
  -> TokenUsagePersistenceEventProcessor / writer queue
  -> token usage ledger rows
  -> derived agent-run/team-run/user summaries
```

`TOKEN_USAGE_UPDATED` means: new token usage information has arrived for this agent run. It does **not** mean overwrite a single mutable total. Storage remains append-oriented.



## Authoritative Token Count Ownership

Authoritative token counts must come from provider/runtime-reported usage payloads only. AutoByteus should not calculate or estimate persisted token counts itself.

Target rule:

```text
provider/runtime reported usage exists -> emit TOKEN_USAGE_UPDATED
provider/runtime reported usage missing -> mark missing/unknown; do not estimate
```

This simplifies the runtime significantly. `BaseTokenCounter`, `TokenUsageTracker`, and `TokenUsageTrackingExtension` should not participate in persisted accounting. If local token counting is kept for unrelated preflight/debug purposes, it must remain outside the ledger path and outside cost calculation.

## Cost Calculation Ownership

Cost is derived data. It should not be calculated inside `autobyteus-ts` as part of token capture.

Target ownership:

```text
autobyteus-ts / runtime adapters -> token counts + model identity
server token-usage subsystem -> cost calculation and summaries
frontend -> display only
```

The current `TokenUsageTracker` / `TokenUsageTrackingExtension` path should not remain authoritative because it mixes token estimation, provider usage replacement, pricing, and in-memory aggregation. In the new design, runtime token events carry counts; a server-side token-usage event enrichment step resolves price and computes estimated API cost before the enriched `TOKEN_USAGE_UPDATED` event is dispatched to frontend listeners. Persistence then stores that same enriched event asynchronously/idempotently. Historical projections may recompute only when explicitly rebuilding summaries from stored rows, not as the live UI path.

The server token-usage subsystem must expose one explicit price lookup boundary: `TokenPriceConfigProvider`. The cost calculator depends on that provider, not on runtime-specific model classes. For v1, built-in price values should come only from the existing `autobyteus-ts` model metadata (`LLMConfig.pricingConfig` in `supported-model-definitions.ts`) through an exported resolver, not from duplicated server constants or a duplicated server price table. The authoritative calculation boundary still lives on the server so token capture, pricing lookup, and ledger snapshots remain separated.

For v1, cost has one product meaning: **estimated API price**. The platform always calculates token cost as if the model call were billed by the model provider's public/configured API price. This is useful for every runtime because it shows what the usage would cost under the shared API price catalog. The ledger should label it as an estimate from API pricing, not as reconciled invoice truth.

If the model is not found in the shared `autobyteus-ts` price catalog, store token usage only and mark price as missing.

## Frontend Transparency Scope

The first milestone now includes a minimal live transparency surface, not a full analytics dashboard:

- a right-side workspace tab named `Usage` / `Token Meter`,
- a compact header chip in the active agent/team header,
- ledger-backed summary/query support for reload/history,
- no frontend-side price calculation.

Polished dashboards, forecasting, quota enforcement, and budget policy remain out of scope.

## Provider Terminology

Use explicit terminology to avoid ambiguity:

| Term | Meaning | Examples |
| --- | --- | --- |
| `runtime_kind` | The AutoByteus execution harness running the agent. | `autobyteus`, `codex_app_server`, `claude_agent_sdk` |
| `model_provider` | The model/vendor family when known. This corresponds to `LLMModel.provider` in native LLM models. | `OPENAI`, `ANTHROPIC`, `GEMINI`, `OLLAMA`, `DEEPSEEK`, `KIMI` |
| `ingestion_kind` | Optional internal audit/debug hint for which runtime bridge produced the usage observation. It is not a business metric and can be hidden from product UI. | `autobyteus_llm_phase`, `codex_thread_token_usage`, `claude_sdk_result` |
| `model_identifier` / `model_value` | The concrete model identity used for pricing and display. | `gpt-5.4`, `claude-sonnet-4.6`, Codex thread model string |
| `cost_basis` | The interpretation of calculated cost. In v1 this is always API price estimate when pricing exists. | `api_price_estimate` |

In earlier notes I used `provider` as shorthand. The design should use `model_provider` for the model/vendor and keep `runtime_kind` separate.

## Task Design Health Assessment

- Change posture: Larger Requirement / Feature / Refactor.
- Current design issue found: Yes.
- Root cause classification: Boundary Or Ownership Issue + Duplicated Policy Or Coordination + Shared Structure Looseness.
- Refactor needed now: Yes, for token usage accounting paths.
- Evidence:
  - Optional `TokenUsagePersistenceProcessor` is runtime-specific and not mandatory.
  - Old `token_usage_records` cannot represent per-turn/call source, scope, raw usage, or pricing snapshots.
  - Codex parses usage but drops it before durable accounting.
  - Claude SDK result usage is not extracted.
  - Native AutoByteus tool-call LLM phases can produce usage but are not always final assistant-complete events.
- Design response:
  - Add one normalized token usage event boundary across runtimes.
  - Move authoritative persistence into server-side token usage subsystem, not optional per-agent response processors.
  - Store raw meter readings as append-only records keyed by agent run identity.
- Refactor rationale:
  - Token accounting is a cross-runtime platform concern; it should not be optional agent customization.
- Intentional deferrals:
  - Polished dashboards, forecasting, quota enforcement, and budget policy remain out of first milestone. The minimal live Usage/Token Meter tab and header chip are in scope.

## Legacy Removal Policy

No backward-compatibility dual write or legacy compatibility path should be part of the target design.

- Decommission `TokenUsagePersistenceProcessor` as the authoritative token accounting path.
- Decommission or demote `TokenUsageTracker` / `TokenUsageTrackingExtension` from authoritative accounting. They may remain only as local estimation/debug utilities if still needed.
- Old `token_usage_records` must not remain in the authoritative or compatibility path for this feature. If historical migration is needed, perform a one-time migration/import decision separately; do not keep the old table as a live source.
- Do not restore the old Codex backend blocking persistence path from historical commit `764003448...`.

## Data-Flow Spine Inventory

| Spine ID | Scope | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Runtime-specific token source | Token usage ledger row | TokenUsage subsystem | Main token accounting path |
| DS-002 | Return/Event | Runtime event | `TOKEN_USAGE_UPDATED` event listeners | AgentRunEvent pipeline | Enables live visibility and persistence from one normalized event |
| DS-003 | Bounded Local | Codex raw token update | Ready Codex turn usage | CodexThread | Codex usage readiness/de-dupe is thread-owned |
| DS-004 | Bounded Local | Claude SDK query chunk | Claude token usage update event | ClaudeSession | Claude result usage extraction is session-owned |
| DS-005 | Projection | Ledger rows | Agent/team/user usage summaries | TokenUsage query/projection layer | Future dashboards/budgets derive from raw rows |
| DS-006 | Enrichment | Normalized usage observation | Enriched usage event with estimated API cost/status | TokenUsage pricing/enrichment service | Live UI must receive server-calculated cost without waiting for DB persistence |
| DS-007 | Frontend Display | Enriched usage event or ledger-backed summary | Header chip + Usage/Token Meter tab | Frontend token usage meter store | Keeps display state separate from authoritative accounting |
| DS-008 | Team Aggregation Display | Member agent-run ledger rows | Team total and focused-member meter | TokenUsage query/projection layer + frontend meter store | Team runs do not directly consume tokens; member runs do |

## Use-Case Coverage Against Spine Inventory

| Use Case | Required Spine(s) | Coverage Decision |
| --- | --- | --- |
| Native AutoByteus LLM phase token/cost capture | DS-001, DS-002, DS-006 | Native `LlmPhase` emits usage for every model call; server enriches and persists one event. |
| Codex runtime token/cost capture | DS-001, DS-002, DS-003, DS-006 | `CodexThread` owns raw `thread/tokenUsage/updated` readiness; backend consumes ready usage only. |
| Claude Agent SDK token/cost capture | DS-001, DS-002, DS-004, DS-006 | `ClaudeSession` owns terminal SDK result parsing and emits normalized usage. |
| Standalone agent live meter | DS-002, DS-006, DS-007 | Enriched stream message updates frontend meter store; summary query reconciles reload/history. |
| Team run live meter | DS-002, DS-005, DS-007, DS-008 | Member-run usage events aggregate to team total and focused/member breakdown. |
| Historical/settings statistics | DS-005 | Existing settings view becomes a ledger-backed projection; no old-storage compatibility projection. |
| Model-price lookup and missing-price behavior | DS-006 | Server enrichment resolves shared `autobyteus-ts` model pricing; missing price becomes token-only/price-missing. |
| Cache/reasoning future-proofing without v1 frontend display | DS-001, DS-005, DS-006 | Backend preserves reported fields/quality flags; v1 frontend shows only input/output/total cost meter. |

## Primary Execution Spine

```text
AutoByteus LLM phase / Codex thread update / Claude SDK result
  -> runtime adapter-owned normalizer
  -> AgentRunEventType.TOKEN_USAGE_UPDATED token observation
  -> TokenUsageCostEnrichmentProcessor / TokenUsageCostCalculator
  -> enriched AgentRunEventType.TOKEN_USAGE_UPDATED
  -> websocket/frontend listeners and TokenUsageEventPersistenceProcessor
  -> TokenUsageLedgerStore append of enriched event
  -> SQL token usage ledger table
```


## Token Generation To Unified Event Data-Flow Spans

The design intentionally treats provider/runtime-reported usage as the first authoritative token datum. AutoByteus does not estimate token counts locally.

### Native AutoByteus API runtime

```text
LLM provider generates response tokens
  -> provider API response / final stream usage payload
  -> provider-specific usage adapter builds LlmTokenUsageObservation
     (normalized counts + raw_usage_json + provider detail buckets)
  -> CompleteResponse/ChunkResponse carries LlmTokenUsageObservation, not lossy cost-bearing TokenUsage
  -> LlmPhase emits TOKEN_USAGE_UPDATED for that model call with call sequence/id
  -> AutoByteus native stream event carries the usage observation to the server backend
  -> AutoByteus server backend converts native stream event to AgentRunEventType.TOKEN_USAGE_UPDATED
  -> AgentRunEventPipeline
  -> TokenUsage context enrichment + snapshot/delta normalization + cost enrichment
  -> frontend TOKEN_USAGE_UPDATED + async ledger append
```

Notes:

- This must happen for every LLM phase/model call, not only final assistant responses.
- Tool-heavy turns can have multiple model calls before the final answer.
- Cost is not calculated in `autobyteus-ts`; the server token usage enrichment step derives estimated API cost from price config before frontend dispatch and persistence.
- Provider adapters must not collapse raw provider usage into `prompt_tokens/completion_tokens` only. They must preserve the raw usage payload and available details such as OpenAI `prompt_tokens_details.cached_tokens`, Anthropic cache creation/read fields, and provider reasoning/output detail fields when present.

### Codex App Server runtime

```text
Codex runtime/model generates response tokens
  -> Codex App Server emits thread/tokenUsage/updated
  -> codex-thread-notification-handler parses runtime-reported usage
  -> CodexThread records pending turn token usage
  -> CodexThread marks usage ready when turn completes / thread becomes idle
  -> Codex backend reads ready turn usage from CodexThread
  -> Codex backend emits AgentRunEventType.TOKEN_USAGE_UPDATED
  -> AgentRunEventPipeline
  -> TokenUsage cost enrichment
  -> frontend TOKEN_USAGE_UPDATED + async ledger append
```

Notes:

- Raw Codex parsing stays owned by `CodexThread`; higher layers must not parse raw Codex token payloads directly.
- Codex may expose `last` and `total`; the normalized event must preserve raw usage JSON and explicit scope so cumulative snapshots are not accidentally summed as deltas.
- If `last` exists, the usage observation is `usage_scope = per_turn` and the accounting delta equals `last`. If only `total` exists, the usage observation is `usage_scope = cumulative_snapshot` and the server snapshot/delta normalizer must derive the accounting delta before cost/projection.
- For Codex, calculate estimated API cost when the model maps to shared `autobyteus-ts` pricing; otherwise persist token-only with `price_missing`.

### Claude Agent SDK runtime

```text
Claude runtime/model generates response tokens
  -> Claude Agent SDK query stream yields terminal result message
  -> terminal result contains usage / modelUsage / total_cost_usd metadata when available
  -> ClaudeSession extracts runtime-reported usage from result chunk
  -> ClaudeSession emits Claude token usage session event
  -> ClaudeSessionEventConverter maps it to AgentRunEventType.TOKEN_USAGE_UPDATED
  -> AgentRunEventPipeline
  -> TokenUsage cost enrichment
  -> frontend TOKEN_USAGE_UPDATED + async ledger append
```

Notes:

- `ClaudeSession` owns SDK result parsing because it owns query chunk iteration.
- The ledger should store reported usage fields such as input, output, cache-read, and cache-creation tokens when available.
- For Claude Agent SDK, calculate estimated API cost when the model maps to shared `autobyteus-ts` pricing; otherwise persist token-only with `price_missing`.

### Unified downstream span

After runtime-specific normalization, all runtimes converge here:

```text
AgentRunEventType.TOKEN_USAGE_UPDATED
  -> AgentRunEventPipeline
  -> TokenPriceConfigProvider
  -> server TokenCostCalculator for estimated API cost when model price exists
  -> enriched AgentRunEventType.TOKEN_USAGE_UPDATED
  -> AgentRunEventMessageMapper / TeamRunEventWebsocketMapper
  -> frontend tokenUsageMeterStore
  -> header chip + Usage/Token Meter tab
  -> TokenUsageEventPersistenceProcessor
  -> TokenUsageLedgerStore
  -> token_usage_ledger_events table
  -> derived run/team/user summaries
  -> reload/history/settings/future budget projections
```

This is the stable accounting and transparency spine. Runtime-specific details are upstream of `TOKEN_USAGE_UPDATED`; price enrichment is server-side before dispatch; business summaries and frontend displays are downstream projections. The frontend may hold ephemeral display state, but it is never the source of truth.

### Team aggregation display span

Team runs do not directly call LLMs. Member agent runs do. The team meter is therefore a projection:

```text
member TOKEN_USAGE_UPDATED event / member ledger row
  -> root_team_run_id + member_agent_run_id + team route/path identity
  -> TokenUsage team summary query/projection
  -> frontend tokenUsageMeterStore team bucket
  -> Usage tab team total + focused/member breakdown
```

This prevents one ambiguous “team total” from becoming a second source of truth. The authoritative rows stay attached to the consuming member agent run; team totals are derived.

## Spine Narratives

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | A runtime observes token usage, normalizes it, and the server stores one append-only meter reading. | Runtime adapter, AgentRunEvent pipeline, TokenUsageStore | TokenUsage subsystem | runtime-specific normalizers, pricing resolver |
| DS-002 | A normalized usage event is dispatched like other run events after server cost enrichment, enabling live UI without making frontend state authoritative. | AgentRunEvent, message mapper | AgentRunEvent pipeline | websocket mapper, team event mapper |
| DS-003 | Codex raw token updates are consumed by `CodexThread`, which decides when a turn usage is ready before producing a normalized event. | CodexThread | CodexThread | raw payload parser, readiness/de-dupe |
| DS-004 | Claude terminal result chunks are inspected by `ClaudeSession`; usage/modelUsage become normalized session events. | ClaudeSession | ClaudeSession | SDK result payload normalizer |
| DS-005 | Agent/team/user totals are derived by querying ledger rows, optionally cached later. | TokenUsage query/projection | TokenUsage subsystem | aggregation query, materialized summaries later |
| DS-006 | The server resolves model pricing and annotates estimated API cost/status before usage reaches websocket listeners. | TokenUsageCostEnricher, TokenPriceConfigProvider, TokenCostCalculator | TokenUsage subsystem | price lookup, price-missing/partial-price flags |
| DS-007 | The frontend stores enriched usage events/summaries by run id and renders a header chip plus a detailed Usage tab. | tokenUsageMeterStore, Usage tab component, header chip | Frontend display layer | formatting, tab opening, team member breakdown |
| DS-008 | Team totals are derived by aggregating member agent-run usage, never by treating the team as a direct LLM consumer. | TokenUsage projection, team context/member route mapping, frontend meter store | TokenUsage subsystem for totals; frontend store for display | team-member identity mapping, focused-member selector |

## Spine Actors / Main-Line Nodes

- Runtime-specific source owner:
  - `LlmPhase` / `AgentTurn` for native AutoByteus.
  - `CodexThread` for Codex ready-turn usage.
  - `ClaudeSession` for Claude SDK result usage.
- `AgentRunEventType.TOKEN_USAGE_UPDATED`: normalized event boundary.
- `TokenUsageCostEnrichmentProcessor` / transformer: synchronous pre-dispatch event-pipeline step that replaces/enriches token usage payloads with estimated API cost, price snapshot/status, and optional meter-summary fields before dispatch.
- `TokenUsageEventPersistenceProcessor`: server event-pipeline side effect owner for scheduling persistence.
- `TokenUsageLedgerStore`: domain-facing store for append-only token usage events.
- SQL repository/table: durable storage.
- `tokenUsageMeterStore`: frontend-only display store keyed by agent run id/team run id.

## Ownership Map

| Node | Owns |
| --- | --- |
| `AgentTurn` / `LlmPhase` | Native runtime LLM call sequencing, call id, and emitted usage event after every LLM phase. |
| `CodexThread` | Raw Codex token update parsing, readiness by turn, and idempotent exposure of ready usage. |
| `ClaudeSession` | SDK query chunk iteration and extraction of terminal result usage/modelUsage. |
| Runtime converters/backends | Conversion from runtime-specific event/session state to `AgentRunEvent`. |
| `AgentRunEventPipeline` | Common server-side processing of normalized run events. |
| `TokenUsage` subsystem | Event enrichment, ledger storage, persistence contracts, pricing snapshot resolution, aggregation queries. |
| `tokenUsageMeterStore` | Non-authoritative live display state and formatting input for the workspace header chip and Usage tab. |

## Return/Event Spine

```text
TOKEN_USAGE_UPDATED AgentRunEvent
  -> TokenUsageCostEnrichmentProcessor / pre-dispatch transformer
  -> enriched TOKEN_USAGE_UPDATED AgentRunEvent
  -> AgentRunEventMessageMapper / TeamRunEventWebsocketMapper
  -> frontend TokenUsageUpdated stream message
  -> tokenUsageMeterStore
  -> TokenUsageHeaderChip + Usage/Token Meter tab
```

First milestone should expose the enriched event to the frontend because the user-facing feature is token transparency during the run. The same event is still persisted as a ledger row, so reload/history views reconcile through ledger-backed summary queries instead of relying on browser memory.

Important current-code constraint: the existing `AgentRunEventPipeline` appends processor-derived events to the original event array and then dispatches all final events. Cost enrichment must therefore not be implemented as “derive a second `TOKEN_USAGE_UPDATED` event” while leaving the raw unenriched usage event in the final dispatch list. Implementation must add a replacement/transform step before dispatch, or add an explicit pre-dispatch enricher hook, so each usage observation reaches websocket listeners and persistence exactly once with server-calculated cost/status fields.

Target pipeline shape:

```text
runtime events
  -> pre-dispatch event transformers
       - replace/enrich TOKEN_USAGE_UPDATED payloads
  -> derived-event processors
  -> final dispatch list
  -> websocket listeners + async persistence side effects
```

## Bounded Local / Internal Spines

### AutoByteus native LLM call spine

Parent owner: `AgentTurn` / `LlmPhase`.

```text
LLM phase starts -> provider adapter usage observation -> CompleteResponse/ChunkResponse carries LlmTokenUsageObservation -> emit TOKEN_USAGE_UPDATED -> continue final/tool loop
```

Why it matters: native agent turns may have multiple LLM calls due to tool loops. Counting only final assistant responses undercounts token usage.

### Codex thread usage spine

Parent owner: `CodexThread`.

```text
thread/tokenUsage/updated -> parse last/total usage -> pendingTurnTokenUsage -> readyTurnTokenUsages -> TOKEN_USAGE_UPDATED
```

Why it matters: Codex can emit token usage before/after turn completion. Readiness and de-dupe must stay in the thread owner.

### Claude SDK result usage spine

Parent owner: `ClaudeSession`.

```text
SDK query chunk -> terminal result chunk -> extract usage/modelUsage/total_cost_usd -> Claude token usage session event -> TOKEN_USAGE_UPDATED
```

Why it matters: official Claude Agent SDK result messages contain usage/cost data at terminal result boundaries.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Token usage payload normalizers | DS-001/003/004 | Runtime adapters | Convert provider-specific fields to common payload while preserving raw JSON. | Keeps storage schema stable across runtimes. | Provider conditionals leak into persistence. |
| Pricing resolver / calculator | DS-001/005/006 | TokenUsage subsystem | Look up shared model pricing, snapshot it, and annotate estimated API cost/status. | Cost is derived from usage + API price config. | Runtime adapters start owning pricing policy. |
| Live usage meter projection | DS-007 | Frontend display layer | Keep non-authoritative run/team usage display state from enriched events and summary queries. | The UI needs a live meter without becoming accounting owner. | Conversation components or random tabs start calculating their own totals. |
| Persistence queue | DS-001 | TokenUsage subsystem | Schedule bounded asynchronous writes so runtime event dispatch is not blocked by DB latency. | Avoids old Codex stream-stall failure class. | Runtime backends block on storage. |
| Aggregation query/projection | DS-005 | TokenUsage subsystem | Produce agent/team/user totals from ledger rows. | Keeps summaries derived and recalculable. | Mutable totals become false source of truth. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Cross-runtime event convergence | `agent-execution/events` | Extend | All runtimes already normalize through `AgentRunEvent`. | N/A |
| Token storage | `token-usage` | Extend/replace internals | Existing subsystem owns token stats but shape is obsolete. | N/A |
| Runtime-specific parsing | `backends/codex`, `backends/claude`, `autobyteus-ts/agent` | Extend | Each runtime owner knows its raw protocol. | N/A |
| Frontend streaming | `services/agentStreaming` | Extend now for minimal live meter | Existing mapper owns `AgentRunEvent` -> `ServerMessage`; add `TOKEN_USAGE_UPDATED` handling. | N/A |
| Workspace right-side tabs | `components/layout/RightSideTabs.vue`, `composables/useRightSideTabs.ts` | Extend | This is the existing desktop right-panel tab system; user explicitly suggested this location. | N/A |
| Workspace headers | `AgentWorkspaceView.vue`, `TeamWorkspaceView.vue` | Extend | Existing run/team headers already show status and actions; a compact meter chip belongs next to status. | N/A |
| Shared model registry | `autobyteus-ts/src/llm/supported-model-definitions.ts` and curated metadata | Refresh | Server pricing lookup depends on this catalog; user requested stale model cleanup. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem | Owns Which Concerns | Related Spine ID(s) | Decision | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-ts/agent` | Native runtime LLM call usage event emission. | DS-001 | Extend/refactor | Must emit all LLM phases and carry the richer usage observation from provider adapter through `CompleteResponse`/stream events. |
| `agent-execution/backends/codex` | Codex raw token update readiness and normalized event production. | DS-003 | Extend | Keep raw parsing in `CodexThread`. |
| `agent-execution/backends/claude` | Claude SDK result usage extraction. | DS-004 | Extend | Add usage extraction from terminal result chunks. |
| `agent-execution/events` | `TOKEN_USAGE_UPDATED` event type/pipeline processing. | DS-002 | Extend | Common normalized event boundary. |
| `token-usage` | Ledger domain, persistence, pricing snapshot, aggregates. | DS-001/005 | Extend/refactor | Replace old role-split record model as source of truth. |
| `autobyteus-web/services/agentStreaming` | Receive enriched `TOKEN_USAGE_UPDATED` messages and route to the frontend usage meter store. | DS-007 | Extend | Must not hide token usage inside `ASSISTANT_COMPLETE.usage`. |
| `autobyteus-web/stores` + `components/workspace/usage` | Non-authoritative live usage meter state and UI. | DS-007 | Add | Header chip/tab display only; no model pricing math. |
| `autobyteus-ts/llm` | Provider usage observation types/adapters plus shared supported model catalog/pricing metadata. | DS-001/005/006 | Extend/refactor/refresh | Preserve raw provider usage before response normalization and expose trusted/missing/placeholder price lookup; do not block on exact price audit. |

## Draft File Responsibility Mapping

| Candidate File | Owner / Boundary | Concrete Concern |
| --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/domain/agent-run-event.ts` | Agent run event domain | Add `TOKEN_USAGE_UPDATED`. |
| `autobyteus-server-ts/src/agent-execution/domain/agent-run-token-usage.ts` | Agent run event domain | Define normalized token usage event payload types and helpers. |
| `autobyteus-ts/src/llm/utils/llm-token-usage-observation.ts` | Native LLM usage domain | Replace/demote lossy `TokenUsage` for accounting with normalized counts, raw usage JSON, provider detail buckets, usage scope, and quality flags. |
| `autobyteus-ts/src/llm/api/openai-compatible-token-usage-normalizer.ts` | OpenAI-compatible provider adapter | Map OpenAI-compatible `usage` including details/cached tokens into `LlmTokenUsageObservation` without calculating cost. |
| `autobyteus-ts/src/llm/api/anthropic-token-usage-normalizer.ts` | Anthropic provider adapter | Map Anthropic response/stream usage including cache/read/write details into `LlmTokenUsageObservation` without prompt-token zero fallback. |
| `autobyteus-ts/src/llm/utils/response-types.ts` | Native response transport | Carry `LlmTokenUsageObservation \| null` on `CompleteResponse`/`ChunkResponse`; do not expose prompt/completion/cost-only usage as accounting input. |
| `autobyteus-ts/src/agent/events/notifiers.ts` | Native runtime outward event notifier | Add `notifyAgentTokenUsageUpdated`. |
| `autobyteus-ts/src/agent/streaming/events/stream-events.ts` | Native stream event domain | Add native `token_usage_updated` stream event. |
| `autobyteus-ts/src/agent/loop/llm-phase.ts` or `agent-turn.ts` | Native LLM call owner | Emit usage event after every LLM phase; assign call sequence/id. |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/events/autobyteus-stream-event-converter.ts` | Native backend adapter | Map native stream token event to `TOKEN_USAGE_UPDATED`. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-token-usage.ts` | Codex raw parser | Preserve normalized + raw usage/scope. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-agent-run-backend.ts` | Codex backend | Convert ready turn usages into `TOKEN_USAGE_UPDATED` without blocking on persistence. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-token-usage.ts` | Claude session parser | Extract usage/modelUsage from terminal SDK result chunks. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/events/claude-session-event-name.ts` | Claude session event domain | Add session token usage event name if using session event bridge. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/events/claude-session-event-converter.ts` | Claude backend adapter | Map Claude token usage session event to `TOKEN_USAGE_UPDATED`. |
| `autobyteus-server-ts/src/agent-execution/events/agent-run-event-pipeline.ts` | Agent event pipeline | Add/accept a pre-dispatch transformer/enricher phase so token events can be replaced/enriched rather than duplicated as derived events. |
| `autobyteus-server-ts/src/agent-execution/events/default-agent-run-event-pipeline.ts` | Agent event pipeline composition | Register token usage enrichment before token persistence and websocket dispatch. |
| `autobyteus-server-ts/src/agent-execution/events/processors/token-usage/token-usage-cost-enrichment-processor.ts` | Agent event pipeline / TokenUsage bridge | Synchronously enrich token usage events with server-calculated estimated API cost/status before websocket dispatch. |
| `autobyteus-server-ts/src/agent-execution/events/processors/token-usage/token-usage-context-enricher.ts` | Agent event pipeline / TokenUsage bridge | Attach canonical run/team/member/agent-definition/workspace identity from `AgentRunContext.config` and `MemberTeamContext`. |
| `autobyteus-server-ts/src/token-usage/projections/token-usage-snapshot-delta-normalizer.ts` | TokenUsage projection/accounting | Convert cumulative snapshots into server-owned accounting deltas before cost/projection. |
| `autobyteus-server-ts/src/agent-execution/events/processors/token-usage/token-usage-event-persistence-processor.ts` | Agent event pipeline | Schedule persistence of normalized token usage events. |
| `autobyteus-server-ts/src/token-usage/domain/ledger-event.ts` | TokenUsage domain | Define ledger create/read model. |
| `autobyteus-ts/src/llm/supported-model-definitions.ts` | Shared model catalog | Refresh current supported model definitions: add `claude-opus-4.8`, `grok-4.3`, `grok-build-0.1`, `minimax-m3`, `qwen3.7-max`; remove/de-prioritize stale entries requested by user such as `claude-haiku-4.5` and old Grok names; keep price exactness non-blocking. |
| `autobyteus-ts/src/llm/metadata/curated-model-metadata.ts` | Shared model metadata | Add/update context/output metadata for refreshed model identifiers so list-model APIs and pricing lookup use one catalog identity. |
| `autobyteus-ts/src/llm/api/grok-llm.ts`, `qwen-llm.ts`, `minimax-llm.ts` | Provider default model constructors | Update default model identities to current supported choices where defaults are stale. |
| `autobyteus-server-ts/src/token-usage/pricing/token-cost-calculator.ts` | TokenUsage pricing | Calculate estimated API input/output/cache/total cost when `TokenPriceConfigProvider` resolved a shared-catalog price snapshot. |
| `autobyteus-server-ts/src/token-usage/pricing/token-price-config-provider.ts` | TokenUsage pricing | Resolve dated model price config by delegating built-in pricing to the shared `autobyteus-ts` model pricing API; unmatched models become token-only rows. |
| `autobyteus-server-ts/src/token-usage/projections/token-usage-run-summary-provider.ts` | TokenUsage query/projection | Produce run/team summary data for reload/history and Usage tab reconciliation. |
| `autobyteus-server-ts/src/token-usage/providers/token-usage-ledger-store.ts` | TokenUsage domain service | Append enriched ledger events idempotently and expose aggregate queries. |
| `autobyteus-server-ts/src/token-usage/repositories/sql/token-usage-ledger-repository.ts` | Persistence adapter | SQL/Prisma persistence for new ledger table. |
| `autobyteus-server-ts/prisma/schema.prisma` | Persistence schema | Add new token usage ledger model/table. |
| `autobyteus-web/services/agentStreaming/protocol/messageTypes.ts` | Frontend stream protocol | Add `TOKEN_USAGE_UPDATED` message payload with server-calculated cost/status fields. |
| `autobyteus-web/services/agentStreaming/handlers/tokenUsageHandler.ts` | Frontend stream handler | Apply usage updates to `tokenUsageMeterStore` for standalone and team streams. |
| `autobyteus-web/stores/tokenUsageMeterStore.ts` | Frontend display state | Store latest live usage events/summaries by run id/team run id; reconcile with ledger summary queries. |
| `autobyteus-web/components/workspace/usage/TokenUsageMeterPanel.vue` | Frontend usage tab | Render active run/team token/cost/context meter and member breakdown. |
| `autobyteus-web/components/workspace/usage/TokenUsageHeaderChip.vue` | Frontend header chip | Show compact `tokens · estimated cost/status`; open Usage tab on click. |
| `autobyteus-web/composables/useRightSideTabs.ts` | Frontend tab model | Add `usage` tab name/label. |
| `autobyteus-web/components/layout/RightSideTabs.vue` | Frontend right panel | Mount Usage/Token Meter panel without auto-switching on token events. |
| `autobyteus-web/localization/messages/*/shell.ts` | Frontend localization | Add `shell.rightTabs.usage` label for the new tab. |
| `autobyteus-web/components/workspace/agent/AgentWorkspaceView.vue` | Agent workspace header | Render header chip near `AgentStatusDisplay`. |
| `autobyteus-web/components/workspace/team/TeamWorkspaceView.vue` | Team workspace header | Render focused-member/team header chip near `AgentStatusDisplay`. |
| `autobyteus-web/components/settings/TokenUsageStatistics.vue` / `stores/tokenUsageStatistics.ts` | Historical analytics | Later read from ledger-backed statistics projection; not the live run meter. |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Must Not Become |
| --- | --- | --- | --- | --- |
| Token usage event payload | `agent-run-token-usage.ts` | Agent execution domain | Shared by runtime adapters, pipeline, mappers. | A provider-specific kitchen-sink without raw payload preservation. |
| Ledger row model | `token-usage/domain/ledger-event.ts` | TokenUsage | Shared by store/repository/tests. | A mutable summary model. |
| Pricing snapshot | `token-usage/domain/pricing-snapshot.ts` | TokenUsage | Needed for API-metered cost estimates. | Runtime provider config owner. |
| Frontend usage meter summary | `autobyteus-web/types/tokenUsageMeter.ts` | Frontend display layer | Shared by stream handler, store, header chip, and tab. | A duplicate pricing/accounting model. |

## Shared Structure / Data Model Tightness Check

| Shared Structure | One Clear Meaning Per Field? | Notes |
| --- | --- | --- |
| `TokenUsageUpdatedPayload` | Yes after revision | Event payload carries one observed usage reading plus server-enriched context identity, accounting delta fields, trusted price status, and raw provider/runtime payloads. |
| `LlmTokenUsageObservation` | Yes after revision | Native/provider-level shape for raw usage preservation before server event conversion; not a cost/accounting owner. |
| `TokenUsageLedgerEvent` | Yes after revision | Storage model records both reported readings and accounting deltas; summaries sum only accounting deltas. |
| `TokenPricingResolution` / `ModelPricingInfo` | Yes after revision | Distinguishes trusted, missing, and placeholder pricing so default zero cannot mean free. |
| `TokenUsageRunSummary` | Yes | Derived query/projection, not source of truth. |
| `TokenUsageMeterState` | Yes | Browser-only display state derived from enriched events and ledger summaries. |

## Final File Responsibility Mapping

Use the draft mapping above as the target. During implementation, keep the new token usage event/domain files small and avoid expanding old `models.ts`/generic helpers with mixed provider-specific parsing.

## Ownership Boundaries

- Runtime adapters own raw protocol parsing and provider-specific usage extraction before any lossy normalized response object is built.
- `AgentRunEvent` owns normalized runtime event shape, including canonical context identity after server-side enrichment.
- `TokenUsage` subsystem owns pre-dispatch enrichment, durable ledger persistence, and cost interpretation.
- Frontend and settings pages may display/query token data but must not become accounting owners.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) | Upstream Callers Must Use | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| Native provider usage observation | Provider adapter usage normalizers and `LlmTokenUsageObservation` | `LlmPhase` / native stream event emitter | Server trying to recover cache/reasoning/raw fields after `CompleteResponse.usage` dropped them | Preserve raw usage in adapter-owned observation shape. |
| `CodexThread` ready usage boundary | Raw `thread/tokenUsage/updated` payload parsing and readiness | Codex backend | Backend parsing raw Codex token payload directly | Add richer ready-usage object on `CodexThread`. |
| `ClaudeSession` token usage session event | Raw SDK result chunk parsing | Claude backend converter | Persistence layer inspecting raw SDK chunks | Add usage event emitted from session. |
| `TokenUsageCostEnrichmentProcessor` | `TokenPriceConfigProvider`, `TokenCostCalculator`, trusted/missing/placeholder price decisions | AgentRunEvent pipeline after context/snapshot enrichment | Websocket mapper/frontend calculating cost; persistence storing unenriched rows; default zero treated as real price | Add explicit pricing resolution/status fields. |
| `TokenUsageLedgerStore` | Prisma repository, pricing snapshot | Event persistence processor, GraphQL/query providers | Runtime backends writing SQL directly | Add store methods. |
| `tokenUsageMeterStore` | Non-authoritative display state, event idempotency, summary reconciliation | Header chip, Usage tab, stream handlers | Conversation components directly summing message token fields | Add store selectors for active run/team/focused member. |

## Dependency Rules

Allowed:

- Runtime-specific code may construct normalized token usage events from its own raw protocol.
- `agent-execution/events` may pass normalized token usage events to the `token-usage` subsystem.
- `token-usage` may read pricing config/model metadata only through `TokenPriceConfigProvider`. In v1 that provider delegates built-in prices to the public `autobyteus-ts` model pricing API; unmatched models remain token-only and are not priced.
- Frontend stream handlers may update `tokenUsageMeterStore` from enriched server events and may reconcile with server summary queries.
- Header chip and Usage tab components may format server-provided tokens, cost, currency, and cost status.
- Token usage summaries may only sum server-computed accounting delta fields, not raw reported cumulative snapshot fields.

Forbidden:

- SQL repository access directly from runtime backends.
- Frontend-derived token totals as accounting source of truth.
- Frontend-side model-price lookup or cost calculation.
- One mutable `agent_run.total_tokens` as the authoritative record.
- Higher layers parsing raw Codex or Claude SDK payloads after runtime owners have normalized them.
- Treating websocket-only team payload flattening as the ledger identity source. Ledger identity must come from `AgentRunContext.config` / `MemberTeamContext` / team runtime context.
- Treating `TokenPricingConfig` constructor/default zero as a trusted free price.

## Interface Boundary Mapping

| Interface / API / Method | Subject Owned | Responsibility | Identity Shape |
| --- | --- | --- | --- |
| `emit TOKEN_USAGE_UPDATED(payload)` | AgentRunEvent | normalized usage observation; context/scope/delta/cost enriched before dispatch | `run_id` + `turn_id` + `usage_event_id` + `idempotency_key`; team fields nullable but explicit |
| `enrichTokenUsageContext(payload, runContext)` | AgentRunEvent pipeline / TokenUsage bridge | attach canonical run/team/member/agent/workspace identity before persistence/dispatch | `AgentRunContext.runId` + `AgentRunConfig.agentDefinitionId/workspaceId/runtimeKind/memberTeamContext` |
| `normalizeTokenUsageAccountingDelta(payload)` | TokenUsage projection/accounting | convert reported reading into accounting delta based on `usage_scope` | `run_id` + `runtime_kind` + `ingestion_kind` + `snapshot_series_key` |
| `enrichTokenUsageEvent(payload)` | TokenUsage pricing/enrichment | resolve trusted shared model price, calculate estimated API cost/status, attach pricing snapshot | `usage_event_id` + model provider/identifier/value + pricing status |
| `appendTokenUsageEvent(event)` | TokenUsage ledger | durable append of enriched event | `usage_event_id` / `idempotency_key` unique |
| `applyTokenUsageUpdated(payload)` | Frontend usage meter store | non-authoritative live display update | run/team/member identity + `usage_event_id`; use server `accounting_*`/summary fields only |
| `getAgentRunTokenUsageSummary({ runId })` | Agent run projection | derived totals for one standalone/member run | explicit agent run id; returns nullable team/member identity if applicable |
| `getTeamRunTokenUsageSummary({ rootTeamRunId })` | Team run projection | derived totals across member agent runs | explicit root team run id; no generic run id guessing |
| `getTeamMemberTokenUsageSummary({ rootTeamRunId, memberAgentRunId? , memberRouteKey? })` | Team-member projection | derived totals for one member within a team | compound team + member identity |
| `getUsageStatisticsInPeriod(range, filters)` | Usage analytics projection | settings/statistics aggregate | time range + explicit filters |


## Concrete Removal Scope

Remove these from the authoritative accounting path:

```text
BaseTokenCounter
TokenUsageTracker
TokenUsageTrackingExtension
BaseLLM automatic TokenUsageTrackingExtension registration
BaseLLM.latestTokenUsage as an accounting API
TokenUsage prompt_cost/completion_cost/total_cost as trusted runtime accounting inputs
```

After this simplification, runtime token responsibility is only:

```text
read provider/runtime-reported usage -> emit TOKEN_USAGE_UPDATED
```

No local token counter should be needed for persisted accounting.

## Native AutoByteus Raw Usage Preservation Design

Architecture review finding AR-001 exposed a concrete current-state gap: by the time native usage reaches `CompleteResponse.usage`, the provider-specific details are already gone. The target design therefore changes the native usage shape before server-side collection.

Target native usage shape:

```ts
type LlmTokenUsageObservation = {
  input_tokens: number | null;
  output_tokens: number | null;
  total_tokens: number | null;
  usage_scope: 'per_call';
  model_provider: string | null;
  model_identifier: string | null;
  model_value: string | null;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
  reasoning_output_tokens?: number | null;
  billable_input_tokens?: number | null;
  billable_output_tokens?: number | null;
  raw_usage_json: Record<string, unknown> | null;
  quality_flags: string[];
};
```

Provider adapter mapping rules:

- OpenAI-compatible adapters map `usage.prompt_tokens`, `usage.completion_tokens`, and `usage.total_tokens` to normalized counts and preserve the entire `usage` object in `raw_usage_json`. When present, `prompt_tokens_details.cached_tokens` maps to `cache_read_input_tokens`; completion detail/reasoning fields map to provider detail fields without changing v1 frontend display.
- Anthropic non-streaming adapters map `response.usage.input_tokens` and `response.usage.output_tokens` and preserve `response.usage` raw. Cache creation/read fields map into cache buckets when present.
- Anthropic streaming adapters must accumulate usage across stream events instead of emitting `prompt_tokens: 0` on `message_delta`. `message_start` usage and later deltas are folded into one final `LlmTokenUsageObservation`; if input tokens are truly unavailable, mark `quality_flags += ['input_tokens_missing']` and do not fabricate zero.
- Gemini/Kimi/GLM/Qwen/MiniMax/OpenAI-compatible model variants use their provider-specific or OpenAI-compatible normalizer and preserve raw usage even when only basic counts are known.

Response/stream mapping rule:

- `CompleteResponse.usage` and `ChunkResponse.usage` should carry `LlmTokenUsageObservation | null` for accounting paths.
- The old `TokenUsage` prompt/completion/cost-only shape should not be accepted as authoritative accounting input. If any non-accounting caller still needs legacy names during refactor, the mapping should be explicitly local and not used by server ledger/cost code.
- `AssistantCompleteResponseData`/`parseUsage` should accept the richer usage observation and stop rejecting raw/detail fields.

Concrete native example:

```text
OpenAI response.usage = {
  prompt_tokens: 1000,
  completion_tokens: 120,
  total_tokens: 1120,
  prompt_tokens_details: { cached_tokens: 700 }
}

LlmTokenUsageObservation = {
  input_tokens: 1000,
  output_tokens: 120,
  total_tokens: 1120,
  usage_scope: 'per_call',
  cache_read_input_tokens: 700,
  raw_usage_json: <full usage object>,
  quality_flags: []
}
```

Bad shape to avoid: `createTokenUsage(response.usage)` returning only prompt/completion/total, followed by server code trying to infer cache or reasoning details later. Those details are gone.

## Concrete Pricing And Cost Design

### Where the calculator gets model prices

`TokenCostCalculator` should get prices only through a server-owned resolver:

```text
TokenUsageCostEnrichmentProcessor
  -> TokenCostCalculator
      -> TokenPriceConfigProvider.resolvePrice(model identity, observed_at)
  -> enriched TOKEN_USAGE_UPDATED payload
  -> websocket dispatch + TokenUsageLedgerStore append
```

`TokenPriceConfigProvider` is **not** a second built-in price registry. In v1 it is a server-side adapter/resolver whose only built-in pricing source is the existing `autobyteus-ts` model catalog.

V1 lookup rule:

1. **Call shared AutoByteus model pricing API**: `autobyteus-ts/src/llm/supported-model-definitions.ts` already stores built-in model input/output prices in `LLMConfig.pricingConfig`. The server resolver calls an exported pricing lookup from `autobyteus-ts` and normalizes the result to a server ledger price snapshot.
2. **Runtime-specific model mapping into the shared catalog**: Codex and Claude SDK model list normalizers already expose `provider_type` and `model_identifier` (`OPENAI` for Codex, `ANTHROPIC` for Claude). The resolver maps those strings to the same shared model pricing catalog where possible. In practice these runtimes usually use the same model families already supported by the native AutoByteus API runtime.
3. **Unmatched model = token-only row**: if the model is not found in the shared catalog, do not calculate price. Persist token usage with `price_missing`. No fallback server model-price list is needed for legacy/past models.

Future sparse server overrides may be added later for custom enterprise prices or custom OpenAI-compatible endpoints, but they are **out of scope for the first storage/cost milestone**. The v1 target intentionally avoids duplicated pricing logic.

The implementation should add a small public API in `autobyteus-ts` rather than reaching into private maps or duplicating `supported-model-definitions.ts` in the server, for example:

```ts
LLMFactory.getModelPricingInfo(input: {
  modelIdentifier?: string;
  modelValue?: string;
  canonicalName?: string;
  modelProvider?: LLMProvider | string | null;
}): Promise<ModelPricingInfo | null>
```

`ModelPricingInfo` must include the resolved `model_identifier`, `model_value`, `canonical_name`, `model_provider`, nullable pricing dimensions, and an explicit trust contract:

```ts
type PricingStatus = "trusted" | "missing" | "placeholder";

type ModelPricingInfo = {
  model_identifier: string | null;
  model_value: string | null;
  canonical_name: string | null;
  model_provider: string | null;
  pricing_status: PricingStatus;
  pricing_source: "autobyteus_model_catalog" | string | null;
  price_config_id: string | null;
  currency: string | null;
  input_price_per_million: number | null;
  output_price_per_million: number | null;
  cached_input_read_price_per_million?: number | null;
  cached_input_write_price_per_million?: number | null;
  trusted_dimensions: {
    input: boolean;
    output: boolean;
    cached_input_read: boolean;
    cached_input_write: boolean;
  };
  missing_reason?:
    | "model_not_found"
    | "pricing_config_absent"
    | "constructor_default_zero"
    | "placeholder_price"
    | "dimension_missing";
};
```

If cached-token prices become first-class, extend the shared `TokenPricingConfig` in `autobyteus-ts` so both runtime/model catalog and server accounting use one shape. The shared API must never force omitted prices to trusted zero. A true free/zero-priced model must be represented as `pricing_status = "trusted"`, explicit zero dimensions, a source, and a `price_config_id`. Constructor defaults and local runtime discovery zeros return `missing`/`placeholder`, not trusted zero.

This means the calculator never asks “what did the frontend say the price was?” and never accepts runtime-supplied cost as authoritative. It asks only the server price provider, and the provider delegates built-in model prices to `autobyteus-ts`. If the shared catalog does not know the model or the price is not trusted, API cost estimation is skipped.

### Price config shape

Add a server-owned cost calculation component under `token-usage`, for example:

```text
autobyteus-server-ts/src/token-usage/pricing/token-price-config.ts
autobyteus-server-ts/src/token-usage/pricing/token-price-config-provider.ts
autobyteus-server-ts/src/token-usage/pricing/token-cost-calculator.ts
```

Target server price snapshot shape:

```ts
type TokenPriceConfig = {
  price_config_id: string | null;
  model_provider: string | null;
  model_identifier: string | null;
  model_value: string | null;
  currency: 'USD' | string | null;
  input_price_per_million: number | null;
  output_price_per_million: number | null;
  cached_input_read_price_per_million: number | null;
  cached_input_write_price_per_million: number | null;
  pricing_status: 'trusted' | 'missing' | 'placeholder';
  trusted_dimensions: {
    input: boolean;
    output: boolean;
    cached_input_read: boolean;
    cached_input_write: boolean;
  };
  missing_reason: string | null;
  effective_from: string | null;
  effective_to: string | null;
  source: 'autobyteus_model_catalog' | 'future_server_override' | string | null;
  version: string | null;
};
```

This type is a server snapshot of the shared pricing resolution, not a second all-model price registry. Persist it with each priced ledger row so historical cost estimates remain auditable after catalog changes.

### Cost calculation rules

- Calculate cost for every token usage event using API pricing only when `TokenPriceConfigProvider` resolves `pricing_status = trusted` with trusted input/output dimensions from the shared `autobyteus-ts` catalog.
- Cost uses server-computed `accounting_*_tokens`, not raw reported cumulative snapshot totals.
- Do this calculation in the server event pipeline before `TOKEN_USAGE_UPDATED` is dispatched to websocket/frontend listeners. The DB write must be asynchronous/failure-isolated, but the payload sent to the frontend and the row sent to the ledger writer must carry the same pricing snapshot and cost-status fields.
- Store `estimated_api_input_cost`, `estimated_api_output_cost`, and `estimated_api_total_cost` with `cost_basis = api_price_estimate` and `api_cost_status = estimated` only for trusted dimensions.
- If pricing is `missing` or `placeholder`, or only constructor/default zero is available, token counts still persist; estimated API cost fields remain null with `api_cost_status = price_missing`.
- If one required dimension is trusted and another is missing, persist the trusted partial cost and set `api_cost_status = partial_price_missing`; do not fill missing dimensions with zero.
- When cache token buckets exist, preserve them in backend ledger rows when available, but do not include cache breakdowns in the v1 frontend meter. `estimated_api_input_cost` should still represent the best server-calculated input-cost subtotal from trusted pricing. Cache-specific cost/display remains future scope.
- The calculation does not try to decide the real commercial arrangement behind the run. It is intentionally an estimated API price.
- When cached-token usage is reported, use cached-token price dimensions if configured and trusted in the shared price config. If cached-token prices are missing, keep the affected cache cost partial/null with `partial_price_missing` or a quality flag rather than inventing a price.
- When reasoning/thinking tokens are reported, preserve them as `reasoning_output_tokens` for future backend analysis. If the provider includes them in output tokens, do not double count them. Do not add reasoning-specific frontend display in v1.
- New model entries do not need exact prices to be usable. Missing or placeholder prices should produce `price_missing`/quality status, not authoritative zero-dollar estimated cost.
- The frontend must never use model name + local constants to calculate money. It formats server-provided values and displays `price_missing`/`partial_price_missing` states explicitly.

### Supported model registry refresh

Because the server resolver delegates built-in model lookup to the shared `autobyteus-ts` catalog, this ticket should refresh stale model identities in that catalog before relying on it for token-cost projection. This is a catalog refresh, not a separate server price registry.

Target changes:

| Provider | Target registry action | Pricing rule for this ticket |
| --- | --- | --- |
| OpenAI | Keep `gpt-5.5`, `gpt-5.4`, `gpt-5.4-mini`; optionally add `gpt-5.4-nano`. | Existing prices may stay; exact new price can be filled later. |
| Anthropic | Add `claude-opus-4.8` with value `claude-opus-4-8`; keep `claude-opus-4.7` and `claude-sonnet-4.6`; remove `claude-haiku-4.5`; remove/de-prioritize old `claude-opus-4.6`; do not add `claude-sonnet-4.8` without official model evidence. | Price may be missing/placeholder until audited. |
| Gemini | Keep existing current Gemini rows. | Existing prices may stay. |
| Kimi | Keep `kimi-k2.6` and `kimi-k2.7-code`; optionally add `kimi-k2.7-code-highspeed`. | Kimi prices can remain absent. |
| Qwen | Add `qwen3.7-max`; keep `qwen3-max` only if existing deployments depend on it. | Exact price deferred. |
| GLM | Keep `glm-5.2`. | Existing price may stay. |
| MiniMax | Add `minimax-m3` with value `MiniMax-M3`; make it the current provider default. Keep `minimax-m2.7` only if product still wants a non-latest option. | Exact price deferred. |
| Grok | Replace `grok-4-1-fast-reasoning` with `grok-4.3`; replace `grok-code-fast-1` with `grok-build-0.1`. | Exact price deferred. |
| Mistral | Excluded from this ticket's audit per user direction. | No action required unless user separately confirms removal. |

Implementation must keep model `name`, `value`, and `canonicalName` consistent with provider API IDs because token-usage rows resolve price/model identity through these fields. If a price is unknown, omit trusted pricing or mark it as untrusted rather than relying on a default zero that would later look like a valid free model.

## Canonical Context Identity Enrichment

Architecture review finding AR-003 requires one owner for run/team identity. The target event payload and ledger row must not rely on websocket-only field flattening.

Canonical sources:

| Identity Field | Canonical Source / Owner | Rule |
| --- | --- | --- |
| `run_id` | `AgentRunContext.runId` / `AgentRunEvent.runId` | Required for every usage event. For team members this is the member agent run id. |
| `agent_definition_id` | `AgentRunConfig.agentDefinitionId` | Required when run config is available; otherwise null + quality flag. |
| `workspace_id` | `AgentRunConfig.workspaceId` | Nullable; use run config value, not frontend path guessing. |
| `runtime_kind` | `AgentRunConfig.runtimeKind` plus runtime bridge payload | Server context is canonical when payload omits or disagrees; disagreements get quality flag. |
| `root_team_run_id` | `AgentRunConfig.memberTeamContext.teamRunId`; for nested/team multiplexing, `TeamRunEvent.teamRunId` confirms the root envelope | Null for standalone. |
| `member_agent_run_id` | `AgentRunConfig.memberTeamContext.memberRunId` or `AgentRunContext.runId` for member runs | Null for standalone; equals consuming agent run id for team member rows. |
| `member_path` | `MemberTeamContext.memberPath` / `TeamRunEvent.data.memberPath` | Store as JSON array when available. |
| `member_route_key` | `MemberTeamContext.memberRouteKey` / `TeamRunEvent.data.memberRouteKey` | Store as stable member selector. |
| `team_run_path` | Team runtime context / nested team metadata where available | Nullable in v1; required only when nested team path is known. |
| `task_agent_instance_*` | `MemberTeamContext.taskAgentInstance` or team event payload | Nullable; preserved for task-agent audit but not required for v1 totals. |

Implementation owner:

```text
AgentRunEventPipeline
  -> TokenUsageContextEnricher(runContext, event)
     reads AgentRunContext.config + MemberTeamContext
     attaches canonical identity fields
  -> TokenUsageAccountingDeltaNormalizer
  -> TokenUsageCostEnrichmentProcessor
```

Team websocket mappers may continue adding display aliases (`agent_name`, `agent_id`, `source_path`), but these aliases are not ledger identity authority. Ledger/query identity must come from the enriched token usage payload.

## Usage Scope And Accounting Delta Semantics

Architecture review finding AR-004 requires one server-owned aggregation rule. The ledger stores both the provider/runtime-reported reading and the accounting delta used by summaries/cost. Summaries and live meter totals must sum only `accounting_*` fields.

Definitions:

```text
reported_*_tokens    = the raw normalized reading from provider/runtime
accounting_*_tokens  = server-computed delta that contributes to run/team totals and cost
usage_scope          = per_call | per_turn | cumulative_snapshot
snapshot_series_key  = stable series identity for cumulative snapshots
```

Scope rules:

| usage_scope | Reported Meaning | Accounting Delta Rule | Example |
| --- | --- | --- | --- |
| `per_call` | one provider API call response | `accounting_* = reported_*` | Native AutoByteus LLM phase usage. |
| `per_turn` | one runtime turn/request usage delta | `accounting_* = reported_*` | Codex `tokenUsage.last`; Claude SDK terminal result for one turn. |
| `cumulative_snapshot` | total observed so far for a stable runtime/session/thread series | `accounting_* = current_reported_* - previous_reported_*` for same `snapshot_series_key`; if no previous snapshot for this run/series, first delta equals current snapshot with quality flag `first_cumulative_snapshot_assumed_run_origin` | Codex `tokenUsage.total` fallback. |

Cumulative snapshot safeguards:

- `snapshot_series_key` is required for `cumulative_snapshot` rows. For Codex use a stable key such as `codex_thread:<thread_id || run_id>`.
- Store `previous_snapshot_event_id` when a prior snapshot is used.
- If a later snapshot decreases, do not add a negative delta. Persist the row with `accounting_* = null` or `0` according to implementation convention, add `quality_flags += ['cumulative_snapshot_regressed']`, and exclude it from cost/summary totals.
- Cost calculation must use accounting deltas only. A `total` fallback row cannot be priced by multiplying the full cumulative total again after an earlier snapshot was already priced.

Concrete Codex example:

```text
Event A: tokenUsage.total = input 800, output 200, total 1000
  previous snapshot: none
  reported_total_tokens = 1000
  accounting_total_tokens = 1000
  quality_flags = ['first_cumulative_snapshot_assumed_run_origin']

Event B: tokenUsage.total = input 1100, output 300, total 1400
  previous snapshot: Event A
  reported_total_tokens = 1400
  accounting_total_tokens = 400

Run summary total = 1400, not 2400.
```

Bad shape to avoid: storing `usage_scope = cumulative_snapshot` but letting projections sum `total_tokens` directly.

## Target Token Usage Event Shape

```ts
type TokenUsageUpdatedPayload = {
  usage_event_id: string;        // generated for this normalized event
  idempotency_key: string;       // stable per runtime source observation

  // Canonical consuming-run identity
  run_id: string;
  turn_id: string | null;
  llm_call_id: string | null;
  call_sequence: number | null;

  // Canonical team/member identity, enriched server-side before persistence/dispatch
  root_team_run_id: string | null;
  team_run_path: string[] | null;
  member_agent_run_id: string | null;
  member_path: string[] | null;
  member_route_key: string | null;
  agent_definition_id: string | null;
  workspace_id: string | null;
  task_agent_instance_id?: string | null;
  task_agent_run_id?: string | null;
  task_id?: string | null;

  runtime_kind: "autobyteus" | "codex_app_server" | "claude_agent_sdk";
  model_provider: string | null;
  model_identifier: string | null;
  model_value: string | null;

  ingestion_kind:
    | "autobyteus_llm_phase"
    | "codex_thread_token_usage"
    | "claude_sdk_result";
  usage_scope: "per_call" | "per_turn" | "cumulative_snapshot";
  snapshot_series_key: string | null;
  previous_snapshot_event_id: string | null;

  // Provider/runtime reported reading. Never sum cumulative reported fields directly.
  reported_input_tokens: number | null;
  reported_output_tokens: number | null;
  reported_total_tokens: number | null;

  // Server-owned accounting delta. Summaries/cost/frontend live totals use these fields.
  accounting_input_tokens: number | null;
  accounting_output_tokens: number | null;
  accounting_total_tokens: number | null;

  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
  reasoning_output_tokens?: number | null;
  billable_input_tokens?: number | null;
  billable_output_tokens?: number | null;

  // Server-enriched API price estimate; null when price is missing/untrusted.
  cost_basis: "api_price_estimate" | null;
  currency: string | null;
  input_price_per_million: number | null;
  output_price_per_million: number | null;
  cached_input_read_price_per_million?: number | null;
  cached_input_write_price_per_million?: number | null;
  pricing_source: string | null;
  pricing_status: "trusted" | "missing" | "placeholder";
  pricing_missing_reason: string | null;
  pricing_snapshot_json: Record<string, unknown> | null;
  estimated_api_input_cost: number | null;
  estimated_api_standard_input_cost?: number | null;
  estimated_api_cache_read_input_cost?: number | null;
  estimated_api_cache_creation_input_cost?: number | null;
  estimated_api_output_cost: number | null;
  estimated_api_reasoning_output_cost?: number | null;
  estimated_api_total_cost: number | null;
  api_cost_status:
    | "estimated"
    | "price_missing"
    | "partial_price_missing";

  // Optional live-meter projection helpers produced by server only.
  meter_delta_input_tokens?: number | null;     // alias of accounting_input_tokens for UI convenience
  meter_delta_output_tokens?: number | null;    // alias of accounting_output_tokens for UI convenience
  meter_delta_total_tokens?: number | null;     // alias of accounting_total_tokens for UI convenience
  run_summary_after_event?: TokenUsageRunSummaryPayload | null;
  latest_context_input_tokens?: number | null;
  effective_context_budget_tokens?: number | null;
  context_pressure_percent?: number | null;

  raw_usage_json: Record<string, unknown> | null;
  raw_event_json: Record<string, unknown> | null;
  quality_flags: string[];
};
```

Use nullable token fields only when a runtime provides partial usage. Persistence should retain partial/missing usage with quality flags or explicitly skip with an auditable reason rather than fabricating zeros or estimating token counts locally.

`meter_delta_*` and `run_summary_after_event` are display helpers, not separate accounting facts. If implemented, they must be produced by the server-side normalizer/projection and equal or derive from `accounting_*` fields so the frontend does not need to infer how to sum `per_call`, `per_turn`, and `cumulative_snapshot` observations differently. If they are not implemented in v1, the Usage tab must reconcile from `getAgentRunTokenUsageSummary` / `getTeamRunTokenUsageSummary` and clearly treat live event-only totals as provisional display state.

## Frontend Usage / Token Meter Design

### Placement

Add a new right-side tab:

```text
useRightSideTabs.TabName += "usage"
RightSideTabs.vue -> <TokenUsageMeterPanel />
```

Recommended label: `Usage` if the tab needs to remain short; panel title can be `Token Meter`.

Why this location:

- the existing right-side tab set already hosts run-scoped operational surfaces (`Progress`, `Terminal`, `Artifacts`, `Browser`, files);
- token usage is run/team operational state, not global settings;
- the tab can show enough details without crowding the chat feed;
- token events should not auto-switch the user away from their current tab.

Add a compact header chip in both active workspace headers:

```text
AgentWorkspaceView.vue:
  AgentStatusDisplay -> TokenUsageHeaderChip -> header actions

TeamWorkspaceView.vue:
  AgentStatusDisplay -> TokenUsageHeaderChip -> mode switch/actions
```

Example chip text:

```text
28.4k tok · $0.12 est
```

The chip opens the right-side Usage tab when clicked. It should be hidden or neutral when no active run exists. It should show tokens even when cost is missing, for example:

```text
28.4k tok · unpriced
```

### Frontend data ownership

Add `autobyteus-web/stores/tokenUsageMeterStore.ts` as a display store only. It should be keyed by:

- `agentRunId` for standalone agent runs and team member runs,
- `teamRunId` for team aggregate display,
- `usage_event_id` / `idempotency_key` for idempotent live updates.

The store may keep:

- latest events by run id,
- server-provided run summary snapshots when present,
- ledger-backed summary query results,
- selected/focused team member breakdown.

The store must not contain model price tables, provider price constants, or cost calculation formulas.

### Server/API inputs to the frontend

The frontend reads token meter data from two server-provided sources:

1. `TOKEN_USAGE_UPDATED` stream messages for live updates.
2. Ledger-backed summary queries for initial load, reload/history, and reconciliation:
   - `getAgentRunTokenUsageSummary(runId)`
   - `getTeamRunTokenUsageSummary(teamRunId)`
   - optional `listAgentRunTokenUsageEvents(runId, limit/cursor)` for drill-down.

The right-side Usage tab should request the summary query when it opens or when the active run changes. The header chip can use live store state and fall back to summary state if already loaded.

Suggested summary payload:

```ts
type TokenUsageRunSummaryPayload = {
  run_id: string;
  root_team_run_id: string | null;
  team_run_path: string[] | null;
  member_agent_run_id: string | null;
  member_path: string[] | null;
  member_route_key: string | null;
  agent_definition_id: string | null;
  workspace_id: string | null;
  input_tokens: number;       // sum(accounting_input_tokens)
  output_tokens: number;      // sum(accounting_output_tokens)
  total_tokens: number;       // sum(accounting_total_tokens)
  estimated_api_input_cost: number | null;
  estimated_api_output_cost: number | null;
  estimated_api_total_cost: number | null;
  currency: string | null;
  api_cost_status: "estimated" | "price_missing" | "partial_price_missing" | "mixed";
  latest_context_input_tokens: number | null;
  effective_context_budget_tokens: number | null;
  context_pressure_percent: number | null;
  latest_model_provider: string | null;
  latest_model_identifier: string | null;
  latest_runtime_kind: string | null;
  event_count: number;
  updated_at: string | null;
};
```

### What the Usage tab shows in v1

Keep the v1 meter simple and cost-oriented. The primary display should answer: “how many tokens has this run consumed so far, and what is the estimated API cost?”

Minimum standalone run sections:

1. **Summary cards**
   - input tokens so far,
   - output tokens so far,
   - total tokens so far,
   - input token cost,
   - output token cost,
   - total estimated API cost.
2. **Price status**
   - `estimated`, `price_missing`, `partial_price_missing`, or `mixed`,
   - never show `$0` as an estimated cost when price is missing.

Secondary/optional details:

- latest per-call input tokens,
- effective context budget and context pressure percentage when known,
- latest model/runtime identity,
- small recent-event table for audit/debug if cheap to implement.

Minimum team sections:

- team total across member agent runs,
- focused member usage,
- member breakdown table,
- same unpriced semantics as standalone runs.

### Context pressure semantics

The product must not present cumulative input tokens as context-window fullness. These are different meters:

```text
consumed_input_tokens = sum of billable input tokens across calls
latest_context_input_tokens = input tokens submitted in the latest relevant model call
effective_context_budget = activeContextTokens || maxInputTokens || maxContextTokens
context_pressure_percent = latest_context_input_tokens / effective_context_budget
```

Consumed tokens/cost answer “how much did this run spend?” Context pressure answers “how close was the latest model call to compaction/context limits?” They can both appear in the same UI but must be labeled separately.

### Existing surfaces

- `components/settings/TokenUsageStatistics.vue` remains the global/historical analytics surface. It should eventually read from the new ledger projection and stop hardcoding a currency that may not match the server's `currency`.
- `AgentConversationFeed.vue` already has message-level token/cost fields, but it should not become the primary usage meter. One visible assistant message can hide multiple model calls; therefore conversation-level display is at most a secondary projection from the ledger/event model.

## Target Ledger Storage Shape

Suggested table: `token_usage_ledger_events`.

Essential columns:

```text
usage_event_id unique
idempotency_key unique
observed_at
persisted_at
run_id
turn_id
llm_call_id
call_sequence
root_team_run_id
team_run_path_json
member_agent_run_id
member_path_json
member_route_key
agent_definition_id
workspace_id
task_agent_instance_id
task_agent_run_id
task_id
runtime_kind
model_provider
model_identifier
model_value
ingestion_kind
usage_scope
snapshot_series_key
previous_snapshot_event_id
reported_input_tokens
reported_output_tokens
reported_total_tokens
accounting_input_tokens
accounting_output_tokens
accounting_total_tokens
cache_read_input_tokens
cache_creation_input_tokens
reasoning_output_tokens
billable_input_tokens
billable_output_tokens
raw_usage_json
raw_event_json
quality_flags_json
cost_basis
currency
input_price_per_million
output_price_per_million
cached_input_read_price_per_million
cached_input_write_price_per_million
pricing_source
pricing_status
pricing_missing_reason
pricing_snapshot_json
estimated_api_input_cost
estimated_api_standard_input_cost
estimated_api_cache_read_input_cost
estimated_api_cache_creation_input_cost
estimated_api_output_cost
estimated_api_reasoning_output_cost
estimated_api_total_cost
api_cost_status
```

Projection invariant: `reported_*` fields preserve what the runtime/provider said; `accounting_*` fields are the only token fields that ledger-backed run/team/user summaries and cost totals aggregate.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Must Not Contain |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/domain/agent-run-token-usage.ts` | File | AgentRunEvent domain | normalized usage event payload type/helpers | DB persistence logic |
| `autobyteus-ts/src/llm/utils/llm-token-usage-observation.ts` | File | Native LLM usage observation domain | normalized + raw provider usage observation shared by provider adapters and response types | server pricing or persistence |
| `autobyteus-ts/src/llm/api/*token-usage-normalizer.ts` | Files | Provider adapters | provider-specific mapping from API usage into `LlmTokenUsageObservation` | local token estimation or cost calculation |
| `autobyteus-ts/src/llm/utils/response-types.ts` | File | Native response transport | carry richer usage observations without dropping raw/detail fields | cost/accounting policy |
| `autobyteus-server-ts/src/agent-execution/events/processors/token-usage/` | Folder | AgentRunEvent pipeline | token usage pre-dispatch enrichment and persistence event processor | raw runtime parsing |
| `autobyteus-server-ts/src/token-usage/projections/token-usage-snapshot-delta-normalizer.ts` | File | TokenUsage accounting projection | convert cumulative snapshots into accounting deltas and preserve previous snapshot references | runtime-specific raw parsing |
| `autobyteus-server-ts/src/token-usage/domain/` | Folder | TokenUsage domain | ledger models, pricing snapshot, summaries | runtime-specific protocol parsing |
| `autobyteus-server-ts/src/token-usage/providers/` | Folder | TokenUsage domain service | ledger store and aggregate providers | direct websocket/frontend mapping |
| `autobyteus-server-ts/src/token-usage/repositories/sql/` | Folder | Persistence adapter | Prisma repository | pricing policy |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/` | Folder | CodexThread | raw Codex usage readiness | SQL writes |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/` | Folder | ClaudeSession | raw SDK result usage extraction | SQL writes |
| `autobyteus-ts/src/agent/streaming/events/` | Folder | Native stream domain | native token usage stream event | server SQL writes |
| `autobyteus-ts/src/llm/llm-factory.ts` / `autobyteus-ts/src/llm/model-pricing.ts` | Shared catalog API | Shared model catalog/pricing boundary | expose `getModelPricingInfo(...)` backed by existing `LLMModel.defaultConfig.pricingConfig` plus trusted/missing/placeholder status | server-side cost calculation or ledger persistence |
| `autobyteus-web/components/workspace/usage/` | Folder | Frontend usage meter UI | Header chip and Usage tab presentation | pricing calculation |
| `autobyteus-web/stores/tokenUsageMeterStore.ts` | File | Frontend display state | idempotent live event application and summary reconciliation | authoritative accounting or model price tables |
| `autobyteus-web/services/agentStreaming/handlers/tokenUsageHandler.ts` | File | Frontend stream handling | route `TOKEN_USAGE_UPDATED` payloads to display store | provider-specific raw parsing |
| `autobyteus-web/localization/messages/*/shell.ts` | Files | Frontend localization | right-tab label translations | pricing or business logic |

## Concrete Examples / Shape Guidance

| Topic | Good Example | Bad / Avoided Shape | Why It Matters |
| --- | --- | --- | --- |
| Runtime event | `CodexThread -> TOKEN_USAGE_UPDATED -> TokenUsageCostEnrichmentProcessor -> TokenUsageLedgerStore` | `CodexAgentRunBackend -> TokenUsageStore.createConversationTokenUsageRecords` | Keeps raw parsing, pricing enrichment, and persistence boundaries separated; avoids the historical blocking Codex persistence path. |
| Storage | append `token_usage_ledger_events` rows | update only `agent_run.total_tokens` | Preserves auditability and input/output split. |
| Provider naming | `runtime_kind=claude_agent_sdk`, `model_provider=ANTHROPIC` | one ambiguous `provider=claude` | Avoids mixing harness, vendor, and model. |
| Cost | `estimated_api_*`, `cost_basis=api_price_estimate`, `api_cost_status=estimated\|price_missing` | `cost=0` for unknown/unpriced usage | Prevents unknown cost from looking free while keeping one simple estimated API-price metric. |
| Pricing trust | `pricing_status=trusted` with explicit zero if truly free | omitted `TokenPricingConfig` defaults to `0.0` and becomes `$0 estimated` | Separates missing/placeholder price from real zero-priced models. |
| Cumulative snapshots | reported total `1400`, previous `1000`, accounting delta `400` | summary sums both reported totals as `2400` | Prevents Codex `total` fallback from double-counting. |
| Native raw usage | OpenAI/Anthropic normalizer preserves `raw_usage_json` and cache fields | `CompleteResponse.usage` drops details then server tries to recover them | Raw/detail data must be captured at provider adapter boundary. |
| Live UI | `TOKEN_USAGE_UPDATED -> tokenUsageMeterStore -> TokenUsageHeaderChip + TokenUsageMeterPanel` | `AgentConversationFeed` independently summing message token fields | Keeps live display useful without making conversation rendering an accounting owner. |
| Context pressure | `latest_context_input_tokens / effective_context_budget_tokens` | cumulative input tokens divided by context window | Avoids confusing money spent with current compaction pressure. |

## Backward-Compatibility Rejection Log

| Candidate Compatibility Mechanism | Why Considered | Decision | Clean-Cut Replacement |
| --- | --- | --- | --- |
| Keep optional `TokenUsagePersistenceProcessor` as primary writer | Existing code exists | Rejected as authoritative path | Server-side `TOKEN_USAGE_UPDATED` event persistence. |
| Keep `TokenUsageTracker` as authoritative cost calculator/token counter | Existing tests/code exist | Rejected | Provider/runtime-reported usage supplies token counts; server `TokenCostCalculator` derives estimated API cost from reported ledger token counts and pricing snapshot. |
| Restore old Codex backend direct `TokenUsageStore` writes | Historical fix existed | Rejected | Codex ready usage -> normalized event -> ledger persistence. |
| Store only run total columns | Simple display | Rejected as source of truth | Append-only ledger + derived summary. |
| Collapse provider/runtime/model into one field | Fewer columns | Rejected | Separate `runtime_kind`, `model_provider`, and model identifiers. |
| Use frontend model-price constants to calculate live cost | Fast UI implementation | Rejected | Server enriches `TOKEN_USAGE_UPDATED`; frontend formats cost/status only. |
| Make Settings statistics the first live meter | Existing component exists | Rejected | New workspace Usage/Token Meter tab for run-scoped live transparency; Settings remains historical/global. |

## Change Inventory

| Change Type | Target | Scope |
| --- | --- | --- |
| Add | `AgentRunEventType.TOKEN_USAGE_UPDATED` and normalized token usage payload | Shared server event boundary for all runtimes. |
| Add | Token usage pre-dispatch enrichment/transformer | Replaces raw usage payload with cost-enriched payload before websocket dispatch and persistence. |
| Add | Token usage context identity enrichment | Attaches run/team/member/agent/workspace identity from server run context before ledger/stream use. |
| Add | Token usage snapshot/delta normalizer | Converts cumulative snapshots into accounting deltas and prevents projection double-counting. |
| Add | `token_usage_ledger_events` table/repository/store | Append-only durable source of truth for token meter readings. |
| Add | `TokenPriceConfigProvider` and `TokenCostCalculator` | Server-owned estimated API cost calculation from shared model catalog pricing. |
| Add | Native AutoByteus token usage stream event | Emits provider/runtime-reported usage for every LLM phase/model call. |
| Add | Codex ready-turn normalized usage exposure | Converts `CodexThread` ready usage into `TOKEN_USAGE_UPDATED`. |
| Add | Claude SDK result usage extraction | Converts terminal SDK result usage/modelUsage into `TOKEN_USAGE_UPDATED`. |
| Add | Frontend token usage protocol, handler, store, header chip, and Usage tab | Displays v1 input/output/total token and cost meter without owning accounting. |
| Modify | Native provider usage shapes | Replace/demote prompt/completion/cost-only `TokenUsage` in accounting paths with `LlmTokenUsageObservation` preserving raw provider usage. |
| Modify | Shared `autobyteus-ts` supported model registry | Refresh current user-directed model IDs and expose pricing lookup API. |
| Modify | Settings token statistics provider | Rebuild as ledger projection; do not keep old storage compatibility path. |
| Remove / Decommission | Optional old response-processor accounting path | No longer authoritative after event-ledger path lands. |
| Remove / Decommission | Local token estimation/tracking from persisted accounting | Provider/runtime-reported usage becomes the only accountable token source. |

## Concrete Decommission Plan

| Legacy / Obsolete Path | Current Problem | Target State | Removal / Decommission Criteria |
| --- | --- | --- | --- |
| `TokenUsagePersistenceProcessor` as primary writer | Optional per-agent processor; not runtime-neutral; writes old role-split records. | Removed from authoritative accounting path. | Do not use it for the new feature. Remove built-in accounting registration/tests as ledger events land; settings statistics must move to ledger instead of keeping this writer alive. |
| `TokenUsageStore.createConversationTokenUsageRecords(...)` old role-split model | Stores prompt/assistant rows only; loses turn, runtime, scope, raw payload, team/member identity, and price status. | Replaced by `TokenUsageLedgerStore.appendTokenUsageEvent(...)`. | Stop new writes for this feature. Do not keep read compatibility for live/settings projections; rebuild those projections on the ledger. |
| `token_usage_records` table as source of truth | Lossy table cannot support transparent audit/cost model. | `token_usage_ledger_events` is source of truth. | Do not add new reads/writes for this feature. Remove/archive after explicit one-time historical migration decision; it must not stay as a live compatibility source. |
| `BaseTokenCounter` in persisted accounting | Local estimation conflicts with provider-reported usage requirement. | Not used for persisted accounting. | Remove references from accounting path; retain only if explicitly scoped to debug/preflight and clearly named non-authoritative. |
| `TokenUsageTracker` / `TokenUsageTrackingExtension` | Mixes local estimation, provider usage replacement, cost calculation, and in-memory aggregation. | Not authoritative; server token-usage subsystem owns cost. | Remove automatic registration and persisted-accounting use; delete if no non-accounting callers remain. |
| `BaseLLM.latestTokenUsage` as accounting API | In-memory/runtime-local and not complete across runtimes. | Not used by server ledger, summaries, or frontend meter. | Remove accounting consumers; delete or demote to debug-only if still useful. |
| Historical Codex backend direct `TokenUsageStore` writes | Previously contributed to stream stalls and bypassed common event pipeline. | `CodexThread` ready usage -> normalized event -> enrichment -> ledger queue. | Do not restore direct writes; tests should assert Codex emits/queues through event-ledger path. |
| Frontend `ASSISTANT_COMPLETE.usage` as primary meter source | One assistant message can hide multiple model calls; handler currently ignores usage. | Explicit `TOKEN_USAGE_UPDATED` stream message and ledger summaries. | Keep only as non-authoritative display convenience if needed; do not use for run totals/cost. |
| Frontend model-price constants | Would duplicate pricing policy and drift from server/catalog. | Frontend formats server-provided cost/currency/status only. | Do not introduce; tests should verify UI uses server payload fields. |

## Migration / Refactor Sequence

1. Refresh the shared `autobyteus-ts` supported model registry for current user-requested models, without blocking on exact price audit. Mark unaudited prices as missing/placeholder rather than default trusted zero.
2. Add `LlmTokenUsageObservation` and provider usage normalizers in native `autobyteus-ts`; update `CompleteResponse`, `ChunkResponse`, assistant stream payload parsing, and `LlmPhase` to carry/publish richer observations without raw/detail loss.
3. Add normalized token usage event domain type and `AgentRunEventType.TOKEN_USAGE_UPDATED` with canonical identity, reported token, accounting delta, raw usage, and trusted pricing fields.
4. Add ledger Prisma model/repository/store with idempotent append and both `reported_*` and `accounting_*` token columns.
5. Add server context identity enricher that reads `AgentRunContext.config` / `MemberTeamContext` and writes root team/member/agent/workspace identity into token events before persistence/dispatch.
6. Add snapshot/delta normalizer so `per_call`/`per_turn` events are direct deltas and `cumulative_snapshot` events (especially Codex `total` fallback) are converted against previous snapshots before projection/cost.
7. Add server token cost calculator/pricing resolver plus a pre-dispatch `TokenUsageCostEnrichmentProcessor`/transformer; estimated API costs are derived from accounting token deltas plus trusted shared `autobyteus-ts` model pricing snapshots, not accepted from runtime/frontend as authoritative. Missing/placeholder/default-zero prices are stored/displayed token-only or partial-price-missing. Update the event pipeline so enrichment replaces the usage event payload before dispatch rather than appending a duplicate raw/enriched event pair.
8. Add token usage event persistence processor backed by bounded write queue that appends the already enriched event.
9. Native AutoByteus:
   - add native stream token usage event,
   - emit after every LLM phase with call sequence/id and raw provider usage,
   - map to server `TOKEN_USAGE_UPDATED`.
10. Codex:
   - enhance ready-turn usage object to preserve raw usage/scope/idempotency key and whether source was `last` or `total`,
   - backend emits `TOKEN_USAGE_UPDATED` from ready usages,
   - model `last` as `per_turn` and `total` fallback as `cumulative_snapshot`,
   - remove/decommission old direct write assumptions.
11. Claude:
   - extract terminal result usage/modelUsage,
   - emit session token usage event with raw result usage/event,
   - map to `TOKEN_USAGE_UPDATED`.
12. Add frontend `TOKEN_USAGE_UPDATED` protocol/handler and `tokenUsageMeterStore`; route standalone and team/member usage updates idempotently using server accounting deltas/summaries.
13. Add right-side `Usage` / `Token Meter` tab and active workspace header chip. Do not auto-switch tabs on token events.
14. Add ledger-backed run/team/member usage summary queries and use them for Usage tab initial load/reload reconciliation.
15. Update aggregate settings statistics provider to read from the ledger projection; keep it separate from the live run meter and do not add old-storage compatibility projection.
16. Remove/decommission `BaseTokenCounter`, `TokenUsageTracker`, `TokenUsageTrackingExtension`, and `BaseLLM` automatic token tracking from the authoritative accounting path.
17. Remove/decommission old `TokenUsagePersistenceProcessor` accounting use after ledger path covers required scenarios; do not leave it as a compatibility writer.
18. Add tests for native raw usage preservation, native multi-LLM-phase turn, Codex `last` and `total` snapshot delta handling, Claude result usage, trusted vs missing/placeholder/default-zero pricing, team context identity enrichment, idempotency, aggregate query, frontend handler/store/chip/tab behavior, and refreshed model registry entries.

## Key Tradeoffs

- Event-based accounting is slightly more upfront work than writing directly from each runtime, but it avoids three divergent persistence paths.
- Pre-dispatch cost enrichment adds a synchronous server step before websocket dispatch, but it prevents frontend price duplication and ensures live UI and ledger rows share one cost snapshot.
- A persistence queue reduces runtime blocking risk, but implementation must expose drain/flush hooks for tests and shutdown.
- Preserving raw usage JSON increases storage size but protects against provider schema changes and future pricing refinements.
- A right-side Usage tab is less prominent than putting all details in the chat feed, but it avoids crowding messages and respects that one visible assistant message can contain multiple model calls.

## Risks

- Codex per-turn token event contract is locally observed but not fully documented in public App Server docs; raw payload preservation and quality flags are required.
- Claude SDK estimated cost is client-side and may not equal vendor invoice; mark it estimated.
- Native AutoByteus must count every LLM phase, not only final assistant responses, or tool-heavy runs will be undercounted.
- Anthropic streaming in current native API path has incomplete prompt token capture; quality flags should record partial/known-bad usage.
- If the frontend tries to derive live totals from raw `per_turn` and `cumulative_snapshot` events without server-provided delta/summary semantics, totals can be wrong. Prefer server-provided `meter_delta_*` or summary reconciliation.
- If the Usage tab waits only for asynchronous DB persistence, live transparency may feel stale. Send enriched events immediately and reconcile with ledger summaries later.
- Current event pipeline processors append derived events. If token cost enrichment is implemented as an appended duplicate instead of a replacement/transform, the frontend may receive both raw and enriched usage events and double count or show inconsistent cost status.

## Guidance For Implementation

- Keep `TOKEN_USAGE_UPDATED` as a normalized runtime event, not a storage model.
- Keep ledger rows append-only and idempotent.
- Keep input/output token fields complete for v1 cost calculation. Preserve cache fields backend-side when reported, but skip cache frontend display in v1.
- Do not estimate authoritative token counts locally; use provider/runtime-reported usage only.
- Keep cost interpretation separate from token observation.
- Do not let dashboards or run summaries become the first source of truth.
- Calculate estimated API cost on the server before frontend dispatch; the frontend formats cost/status only.
- Add a true pre-dispatch enrichment/transform step for token usage events; do not dispatch both raw and enriched copies of the same usage observation.
- Preserve native raw provider usage before `CompleteResponse.usage` can drop details; provider adapters own this mapping.
- Treat `pricing_status=trusted` as the only path to `api_cost_status=estimated`; missing/placeholder/default-zero pricing means null cost.
- Prefer `accounting_*` fields for every total/cost projection; `reported_*` fields are audit/source data only.
- Keep the header chip compact and make the right-side Usage tab the detailed run meter.
- Label consumed tokens/cost separately from context pressure/compaction percentage.
