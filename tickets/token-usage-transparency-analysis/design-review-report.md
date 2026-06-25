# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/token-usage-transparency-analysis/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/token-usage-transparency-analysis/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/token-usage-transparency-analysis/design-spec.md`
- Current Review Round: 2
- Trigger: Round 2 architecture review after solution-designer rework for AR-001 through AR-004.
- Prior Review Round Reviewed: Round 1 in this canonical report path before overwrite; prior finding details are rechecked and summarized below.
- Latest Authoritative Round: 2
- Current-State Evidence Basis: Revised artifacts plus targeted source recheck on worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis` at base `5bd521ba83e4a2df852be5e8914915959149137d`; rechecked current `TokenUsage`/`CompleteResponse` lossiness, current `TokenPricingConfig` default-zero behavior, `AgentRunContext`/`AgentRunConfig`/`MemberTeamContext` identity sources, Codex `last ?? total` parser behavior, event pipeline append-only processor behavior, team websocket flattening, and frontend right-tab/stream handler boundaries.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial architecture review after user-approved no-legacy direction | N/A | AR-001, AR-002, AR-003, AR-004 | Fail | No | Strong overall spine but native raw usage, pricing trust, context identity, and mixed-scope aggregation were under-specified. |
| 2 | Rework review after design package revision | AR-001, AR-002, AR-003, AR-004 | None | Pass | Yes | Prior findings are resolved; design is ready for implementation with residual risks noted. |

## Reviewed Design Spec

Reviewed the revised design package, including the round-1 rework report. The revised spec preserves the approved no-legacy/no-compatibility direction while tightening the four previously failing architecture points:

- native provider adapters now own a richer `LlmTokenUsageObservation` before lossy response normalization;
- shared pricing lookup now exposes `trusted | missing | placeholder` status and nullable/trusted dimensions;
- server event-pipeline enrichment owns canonical run/team/member identity from `AgentRunContext.config` / `MemberTeamContext`;
- ledger rows separate provider-reported readings from server-owned `accounting_*` deltas, and projections/cost use only accounting deltas.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | The spec classifies the work as `Larger Requirement / Feature / Refactor`. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | Boundary/ownership, duplicated coordination, and shared-structure looseness are tied to current optional persistence, lossy old storage, dropped Codex usage, missing Claude usage, and native multi-phase undercounting. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Refactor is explicitly required now for token accounting paths; dashboards/forecasting/quota policy remain deferred. | None. |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Revised native usage observation, pricing trust contract, context enricher, snapshot delta normalizer, no-legacy decommission plan, and migration sequence all reflect the refactor decision. | None. |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | AR-001 | High | Resolved | `Native AutoByteus Raw Usage Preservation Design` adds `LlmTokenUsageObservation`, provider adapter normalizers, response/stream mapping rules, concrete OpenAI example, Anthropic no-fabricated-zero rule, and file mappings for `llm-token-usage-observation.ts`, provider normalizers, `response-types.ts`, stream payload parsing, and `LlmPhase`. | Native raw/cache/reasoning detail is now captured at provider-adapter boundary before `CompleteResponse` can lose it. |
| 1 | AR-002 | High | Resolved | `Concrete Pricing And Cost Design` defines `ModelPricingInfo` with `pricing_status`, nullable dimensions, trusted dimension flags, missing reason, and explicit constructor/default-zero handling. Cost rules allow `api_cost_status=estimated` only for trusted dimensions. | Default zero is no longer treated as trusted free price. |
| 1 | AR-003 | High | Resolved | `Canonical Context Identity Enrichment` defines canonical identity sources and a `TokenUsageContextEnricher` that reads `AgentRunContext.runId`, `AgentRunConfig`, and `MemberTeamContext` before persistence/dispatch; payload, summary, and ledger shapes include team/member/agent/workspace/task identity. | Ledger identity no longer depends on websocket-only flattened fields. |
| 1 | AR-004 | High | Resolved | `Usage Scope And Accounting Delta Semantics` defines reported vs accounting fields, direct delta rules for `per_call`/`per_turn`, snapshot diffing by `snapshot_series_key`, previous snapshot reference, regression handling, and a Codex `1000 -> 1400 = 400` example. | Projections/cost now sum only `accounting_*`, preventing Codex `total` double-counting. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Return/Event | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Codex bounded local | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Claude bounded local | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-005 | Projection | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-006 | Enrichment | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-007 | Frontend display | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-008 | Team aggregation display | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-execution/events` | Pass | Pass | Pass | Pass | Correct convergence boundary; pre-dispatch transform requirement remains explicit. |
| `token-usage` | Pass | Pass | Pass | Pass | Owns ledger, cost interpretation, context enrichment bridge, snapshot/delta normalization, and summary projections. |
| `autobyteus-ts/agent` / native LLM runtime | Pass | Pass | Pass | Pass | Now explicitly carries richer provider usage observations through native response/stream path and emits all LLM phases. |
| `agent-execution/backends/codex` | Pass | Pass | Pass | Pass | Thread-owned ready usage now preserves `last` vs `total` scope. |
| `agent-execution/backends/claude` | Pass | Pass | Pass | Pass | Session-owned terminal result extraction remains clear. |
| Shared model catalog (`autobyteus-ts/llm`) | Pass | Pass | Pass | Pass | Reused as single built-in pricing source with explicit trust/missing/placeholder contract. |
| `autobyteus-web` usage meter | Pass | Pass | Pass | Pass | Display-only store/tab/header chip allocation is sound. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Token usage event payload | Pass | Pass | Pass | Pass | Carries usage reading, server identity, accounting delta, pricing status, and raw payload fields. |
| Native usage observation | Pass | Pass | Pass | Pass | `LlmTokenUsageObservation` is native/provider-owned and not a server accounting owner. |
| Ledger row model | Pass | Pass | Pass | Pass | Separates reported readings from accounting deltas. |
| Pricing resolution/snapshot | Pass | Pass | Pass | Pass | Trust state and nullable dimensions prevent default-zero leakage. |
| Usage aggregation/delta semantics | Pass | Pass | Pass | Pass | Snapshot delta normalizer has a named owner and stable series identity. |
| Frontend usage meter summary | Pass | Pass | Pass | Pass | Display shape remains non-authoritative. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `LlmTokenUsageObservation` | Pass | Pass | Pass | Pass | Pass | Provider-level usage observation; raw/details captured before server conversion. |
| `TokenUsageUpdatedPayload` | Pass | Pass | Pass | Pass | Pass | Event payload now contains canonical identity, reported readings, accounting deltas, pricing status, and raw payloads with singular meanings. |
| `TokenUsageLedgerEvent` | Pass | Pass | Pass | N/A | Pass | Append-only source of truth; summaries aggregate only accounting fields. |
| `ModelPricingInfo` / `TokenPriceConfig` | Pass | Pass | Pass | N/A | Pass | Trusted/missing/placeholder status and trusted dimensions control cost calculation. |
| `TokenUsageRunSummaryPayload` | Pass | Pass | Pass | N/A | Pass | Derived projection with explicit identity and accounting-field totals. |
| `TokenUsageMeterState` | Pass | Pass | Pass | Pass | Pass | Browser-only display state. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `TokenUsagePersistenceProcessor` | Pass | Pass | Pass | Pass | Removed as authoritative writer; no compatibility writer. |
| `TokenUsageStore.createConversationTokenUsageRecords` / old role-split writes | Pass | Pass | Pass | Pass | Replaced by ledger append. |
| `token_usage_records` as live source | Pass | Pass | Pass | Pass | Not retained for live compatibility. |
| `BaseTokenCounter`, `TokenUsageTracker`, `TokenUsageTrackingExtension`, `BaseLLM.latestTokenUsage` | Pass | Pass | Pass | Pass | Removed/demoted from persisted accounting. |
| Legacy `TokenUsage` cost fields | Pass | Pass | Pass | Pass | Not accepted as trusted accounting input. |
| Frontend price constants / message usage as primary meter | Pass | Pass | Pass | Pass | Explicitly rejected. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm/utils/llm-token-usage-observation.ts` | Pass | Pass | Pass | Pass | Native usage observation owner. |
| `autobyteus-ts/src/llm/api/*token-usage-normalizer.ts` | Pass | Pass | Pass | Pass | Provider-specific usage mapping; no pricing. |
| `autobyteus-ts/src/llm/utils/response-types.ts` | Pass | Pass | Pass | Pass | Carries richer observation; no accounting policy. |
| `autobyteus-server-ts/src/agent-execution/domain/agent-run-token-usage.ts` | Pass | Pass | Pass | Pass | Normalized event payload helpers. |
| `autobyteus-server-ts/src/agent-execution/events/agent-run-event-pipeline.ts` | Pass | Pass | Pass | Pass | Pre-dispatch transform/enricher phase. |
| `token-usage-context-enricher.ts` | Pass | Pass | Pass | Pass | Server context identity enrichment. |
| `token-usage-snapshot-delta-normalizer.ts` | Pass | Pass | Pass | Pass | Reported-reading to accounting-delta conversion. |
| `token-price-config-provider.ts` / `token-cost-calculator.ts` | Pass | Pass | Pass | Pass | Trust-aware price lookup and cost calculation. |
| `token-usage-run-summary-provider.ts` | Pass | Pass | Pass | Pass | Ledger-backed projections over accounting fields. |
| Frontend usage components/store/handler | Pass | Pass | Pass | Pass | Display-only usage meter. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Runtime adapters -> native usage observation / `AgentRunEvent` | Pass | Pass | Pass | Pass | Runtime parsing stays runtime-owned. |
| `agent-execution/events` -> `token-usage` | Pass | Pass | Pass | Pass | Pipeline can call context/delta/cost enrichment and persistence scheduling. |
| `token-usage` -> shared model pricing API | Pass | Pass | Pass | Pass | Uses public pricing API; no duplicate server built-in price registry. |
| Frontend -> display store/server summaries | Pass | Pass | Pass | Pass | No frontend accounting or price calculation. |
| Runtime backends -> SQL | Pass | Pass | Pass | Pass | Direct persistence bypass remains forbidden. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Native provider usage observation | Pass | Pass | Pass | Pass | Server does not recover dropped raw fields; provider adapters preserve them. |
| `CodexThread` ready usage boundary | Pass | Pass | Pass | Pass | Backend consumes ready usage with scope/raw/idempotency metadata. |
| `ClaudeSession` token usage event | Pass | Pass | Pass | Pass | Raw SDK chunks stay session-owned. |
| Token context/delta/cost enrichment boundary | Pass | Pass | Pass | Pass | Pipeline order and public responsibilities are explicit. |
| Token ledger store | Pass | Pass | Pass | Pass | Store/repository separation remains sound. |
| Frontend usage meter store | Pass | Pass | Pass | Pass | Display-only state and selectors. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `emit TOKEN_USAGE_UPDATED(payload)` | Pass | Pass | Pass | Low | Pass |
| `enrichTokenUsageContext(payload, runContext)` | Pass | Pass | Pass | Low | Pass |
| `normalizeTokenUsageAccountingDelta(payload)` | Pass | Pass | Pass | Low | Pass |
| `enrichTokenUsageEvent(payload)` | Pass | Pass | Pass | Low | Pass |
| `appendTokenUsageEvent(event)` | Pass | Pass | Pass | Low | Pass |
| `applyTokenUsageUpdated(payload)` | Pass | Pass | Pass | Low | Pass |
| `getAgentRunTokenUsageSummary({ runId })` | Pass | Pass | Pass | Low | Pass |
| `getTeamRunTokenUsageSummary({ rootTeamRunId })` | Pass | Pass | Pass | Low | Pass |
| `getTeamMemberTokenUsageSummary({ rootTeamRunId, memberAgentRunId?, memberRouteKey? })` | Pass | Pass | Pass | Low | Pass |
| `LLMFactory.getModelPricingInfo(...)` | Pass | Pass | Pass | Low | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Native `autobyteus-ts` usage observation/normalizer files | Pass | Pass | Low | Pass | Correctly under LLM/provider ownership. |
| `agent-execution/events/processors/token-usage/` | Pass | Pass | Low | Pass | Bridge between event pipeline and token-usage owner. |
| `token-usage/domain/` | Pass | Pass | Low | Pass | Ledger/pricing snapshot/domain models. |
| `token-usage/projections/token-usage-snapshot-delta-normalizer.ts` | Pass | Pass | Medium | Pass | Projection/accounting owner is appropriate; keep it free of runtime parsing. |
| `token-usage/pricing/` | Pass | Pass | Low | Pass | Trust-aware price resolver/calculator. |
| `token-usage/providers/` and `repositories/sql/` | Pass | Pass | Low | Pass | Domain service and persistence adapter split remains clear. |
| Frontend `components/workspace/usage/` and store | Pass | Pass | Low | Pass | Sound display placement. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Event convergence | Pass | Pass | N/A | Pass | Reuses `AgentRunEventPipeline`. |
| Token storage/statistics | Pass | Pass | Pass | Pass | Replaces old internals with ledger/projection model. |
| Native provider usage capture | Pass | Pass | Pass | Pass | Extends provider/response types because old shape is too lossy. |
| Codex readiness/de-dupe | Pass | Pass | N/A | Pass | Extends `CodexThread`. |
| Claude result parsing | Pass | Pass | N/A | Pass | Extends `ClaudeSession`. |
| Shared model pricing | Pass | Pass | Pass | Pass | Public pricing API avoids duplicate server built-in registry. |
| Frontend stream handling/right tabs | Pass | Pass | Pass | Pass | Existing stream/tab systems are correct extension points. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Old storage writer/read source | No target compatibility path | Pass | Pass | Good. |
| Old frontend message fields as primary meter | No target compatibility path | Pass | Pass | Good. |
| Local token estimation/tracker accounting | No target compatibility path | Pass | Pass | Good. |
| Model price default zero as implicit compatibility behavior | No target compatibility path | Pass | Pass | Resolved by explicit pricing trust contract. |
| Runtime-supplied cost as authoritative accounting | No target compatibility path | Pass | Pass | Server calculates from trusted shared pricing only. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Shared model registry/pricing trust refresh | Pass | Pass | Pass | Pass |
| Native raw usage observation refactor | Pass | Pass | Pass | Pass |
| Event domain and pipeline transform | Pass | Pass | Pass | Pass |
| Ledger store/repository | Pass | Pass | Pass | Pass |
| Context identity enrichment | Pass | Pass | Pass | Pass |
| Snapshot/delta normalization | Pass | Pass | Pass | Pass |
| Cost enrichment | Pass | Pass | Pass | Pass |
| Runtime integrations: native, Codex, Claude | Pass | Pass | Pass | Pass |
| Frontend meter and summary queries | Pass | Pass | Pass | Pass |
| Settings statistics rebuild and old-path decommission | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Event pipeline replacement vs appended duplicate | Yes | Pass | Pass | Pass | Clear and important. |
| Legacy path rejection | Yes | Pass | Pass | Pass | Clear. |
| Frontend placement/display | Yes | Pass | Pass | Pass | Clear. |
| Native raw usage preservation | Yes | Pass | Pass | Pass | OpenAI example and bad shape are present. |
| Pricing trust/default-zero behavior | Yes | Pass | Pass | Pass | Trusted zero vs missing/placeholder/default zero is explicit. |
| Cumulative snapshot aggregation | Yes | Pass | Pass | Pass | Codex total snapshot example prevents double-counting. |
| Context identity source | Yes | Pass | N/A | Pass | Canonical source table is clear. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| None blocking | N/A | N/A | Closed for architecture review. |

## Review Decision

- `Pass`: the design is ready for implementation.

## Findings

None.

## Classification

No active findings. Prior round-1 `Design Impact` findings are resolved.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- `TokenUsageSnapshotDeltaNormalizer` should be implemented idempotently under retries/replays so duplicate cumulative snapshots do not generate duplicate accounting deltas before the ledger unique key rejects duplicates.
- The first cumulative snapshot in a series is assumed to start at the run origin with a quality flag; if future Codex/thread reuse proves this assumption wrong, the baseline rule may need a stricter runtime-specific baseline event.
- Anthropic streaming input-token recovery must be verified carefully; missing input tokens should remain flagged/partial, never fabricated as zero.
- Pricing trust depends on implementers correctly classifying existing catalog entries versus constructor/default/local-runtime zeros.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: Architecture review round 2 passes. Proceed to implementation with the revised no-legacy, ledger-owned token usage design.
