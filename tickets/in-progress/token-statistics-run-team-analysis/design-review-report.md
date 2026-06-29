# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-run-team-analysis/tickets/in-progress/token-statistics-run-team-analysis/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-run-team-analysis/tickets/in-progress/token-statistics-run-team-analysis/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-run-team-analysis/tickets/in-progress/token-statistics-run-team-analysis/design-spec.md`
- Current Review Round: 2
- Trigger: Round 2 handoff from `solution_designer` after rework for AR-001 and AR-002.
- Prior Review Round Reviewed: Round 1 in this same canonical report path before overwrite; rework notes at `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-run-team-analysis/tickets/in-progress/token-statistics-run-team-analysis/design-rework-round2.md`.
- Latest Authoritative Round: 2
- Current-State Evidence Basis:
  - Existing code evidence remains unchanged from round 1: current Settings stats path is model-only; ledger has run/team/member/runtime/model/cost/cache fields; private `TokenUsageLedgerStore.buildSummary` mixes aggregate math with run identity; run-history catalog/metadata services expose names/summaries/workspaces/created times/member tree; frontend Settings page is one model table.
  - Round 2 artifact evidence reviewed:
    - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-run-team-analysis/tickets/in-progress/token-statistics-run-team-analysis/requirements.md`
    - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-run-team-analysis/tickets/in-progress/token-statistics-run-team-analysis/investigation-notes.md`
    - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-run-team-analysis/tickets/in-progress/token-statistics-run-team-analysis/design-spec.md`
    - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-run-team-analysis/tickets/in-progress/token-statistics-run-team-analysis/design-rework-round2.md`
    - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-run-team-analysis/ui-prototypes/token-statistics-task-cost/ui-prototype-spec.md`
    - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-run-team-analysis/ui-prototypes/token-statistics-task-cost/ui-behavior-test-matrix.md`

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial design handoff | N/A | AR-001, AR-002 | Fail | No | Design direction was strong, but UI range-mode artifacts conflicted with MVP and shared aggregate shape was too run-summary-specific. |
| 2 | Rework handoff | AR-001, AR-002 | None | Pass | Yes | Both prior findings are resolved; design is ready for implementation. |

## Reviewed Design Spec

Round 2 design keeps the same product scope:

- `By Task` is the default Settings > Token Statistics view.
- Top-level rows are standalone agent runs and root team runs sorted by `Created Time` descending.
- Team rows expand into member rows; member usage is not duplicated as standalone top-level rows.
- Created-time fallback is explicit as `First usage observed`.
- `By Model` remains secondary diagnostics and groups by runtime/model pair.
- No token price formula change and no ledger schema migration are planned.

Round 2 specifically corrects the prior design-impact issues:

- MVP range UI is a static `Usage during period` label/help text only; no dropdown, no selectable `Tasks created in period`, and no `rangeMode` GraphQL argument.
- Shared aggregation is now `TokenUsageCostSummaryAggregate` / `buildTokenUsageCostSummaryAggregate(events)` as an identity-free aggregate core, with `TokenUsageRunSummaryAdapter` / `buildTokenUsageRunSummary(...)` composing focused run/team/member summaries separately.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | `design-spec.md` classifies the task as a feature/product UX improvement with targeted projection refactor. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | Round 2 correctly identifies shared-structure looseness if run-summary DTOs are reused for runtime/model diagnostics, and supports this with current `buildSummary` and model-only stats evidence. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Refactor needed now is targeted to identity-free aggregate extraction plus run-summary adapter; `Tasks created in period`, CSV, and drilldown remain future-only. | None. |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | File mapping, bounded local spines DS-003/DS-004, interface mapping, migration sequence, and examples all reflect the extraction and adapter split. | None. |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | AR-001 | High | Resolved | Requirements add REQ-029/AC-022; UI prototype top controls now specify static `Usage during period` help text only; behavior matrix says no range-mode selector and no `rangeMode` variable; design spec forbids `rangeMode` for MVP. | `Tasks created in period` appears only as future/later guidance, which is acceptable. |
| 1 | AR-002 | Medium | Resolved | Design spec defines identity-free `TokenUsageCostSummaryAggregate`, separate `TokenUsageRunSummaryAdapter`, runtime/model row shape `{ runtimeKind, modelIdentifier, aggregate }`, and explicit bad examples rejecting pseudo run IDs or `TokenUsageRunSummaryPayload` reuse for diagnostics. | Shared structure is now semantically tight enough for implementation. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | `By Task` statistics | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Runtime/model diagnostics | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Identity-free aggregate core | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-004 | Run-summary adapter | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-005 | Run-history metadata enrichment | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `token-usage/projections` | Pass | Pass | Pass | Pass | Correct owner for aggregate builder and run-summary adapter. |
| `token-usage/providers` | Pass | Pass | Pass | Pass | Historical provider remains authoritative; enricher is provider support. |
| `token-usage/domain` | Pass | Pass | Pass | Pass | Subject-specific DTOs keep row identities explicit. |
| `run-history` | Pass | Pass | Pass | Pass | Reused through public services only. |
| GraphQL token usage boundary | Pass | Pass | Pass | Pass | Transport mapping only; provider remains composition owner. |
| Frontend settings token statistics | Pass | Pass | Pass | Pass | Page shell/table split is clear; MVP range label is static. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Token/cost/cache aggregation | Pass | Pass | Pass | Pass | `token-usage-cost-summary-aggregate.ts` owns identity-free aggregation. |
| Existing focused run summary shape | Pass | Pass | Pass | Pass | `token-usage-run-summary-adapter.ts` adapts aggregate + run identity for existing focused summaries only. |
| Task/member/runtime-model DTOs | Pass | Pass | Pass | Pass | `statistics-models.ts` composes explicit identities with aggregate. |
| Created-time fallback state | Pass | Pass | Pass | Pass | DTOs include created-time source; UI copy is not implicit. |
| Frontend cost/status formatting | Pass | Pass | Pass | Pass | Existing formatter reuse remains display-only. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `TokenUsageCostSummaryAggregate` | Pass | Pass | Pass | Pass | Pass | No run/team/member identity fields; valid shared core. |
| `TokenUsageRunSummaryPayload` | Pass | Pass | Pass | Pass | Pass | Restricted to focused summaries through adapter. |
| `TokenUsageTaskStatisticsRow` | Pass | Pass | Pass | Pass | Pass | Uses task identity plus aggregate and metadata. |
| `TokenUsageTaskMemberStatisticsRow` | Pass | Pass | Pass | Pass | Pass | Member identity remains explicit. |
| `TokenUsageRuntimeModelStatisticsRow` | Pass | Pass | Pass | Pass | Pass | Runtime/model identity plus aggregate; no pseudo run identity. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Model-only grouping helper | Pass | Pass | Pass | Pass | Replace with runtime/model grouping. |
| Monolithic private `TokenUsageLedgerStore.buildSummary` | Pass | Pass | Pass | Pass | Replace with aggregate builder + run-summary adapter. |
| Single default model-only Settings table | Pass | Pass | Pass | Pass | Replace with task-first tabs. |
| Old prompt/assistant Settings labels | Pass | Pass | Pass | Pass | Rename to input/output. |
| Fake range-mode selector / `rangeMode` input | Pass | Pass | Pass | Pass | Static MVP label only; created-period mode is follow-up. |
| Runtime/model reuse of run-summary DTO | Pass | Pass | Pass | Pass | Explicitly rejected. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/token-usage/projections/token-usage-cost-summary-aggregate.ts` | Pass | Pass | Pass | Pass | Identity-free aggregation only. |
| `autobyteus-server-ts/src/token-usage/projections/token-usage-run-summary-adapter.ts` | Pass | Pass | Pass | Pass | Focused run summary adapter only. |
| `autobyteus-server-ts/src/token-usage/domain/statistics-models.ts` | Pass | Pass | Pass | Pass | Subject-specific DTOs. |
| `autobyteus-server-ts/src/token-usage/providers/token-usage-run-history-enricher.ts` | Pass | Pass | Pass | Pass | Metadata/fallback concern only. |
| `autobyteus-server-ts/src/token-usage/providers/statistics-provider.ts` | Pass | Pass | Pass | Pass | Historical grouping and double-count policy. |
| `autobyteus-server-ts/src/token-usage/providers/token-usage-ledger-store.ts` | Pass | Pass | Pass | Pass | Ledger boundary and focused summary orchestration. |
| `autobyteus-server-ts/src/api/graphql/types/token-usage-stats.ts` | Pass | Pass | Pass | Pass | Transport mapping only. |
| `autobyteus-web/graphql/queries/token_usage_statistics_queries.ts` | Pass | Pass | Pass | Pass | Task query without `rangeMode`; model query with runtime/cache fields. |
| `autobyteus-web/stores/tokenUsageStatistics.ts` | Pass | Pass | Pass | Pass | Fetch/state owner. |
| `autobyteus-web/components/settings/TokenUsageStatistics.vue` | Pass | Pass | Pass | Pass | Page shell with static range help. |
| Task/model table and cost breakdown components | Pass | Pass | Pass | Pass | UI interaction/display concerns only. |
| Localization files | Pass | Pass | N/A | Pass | Copy owner for new labels and fallback text. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| GraphQL resolver | Pass | Pass | Pass | Pass | Resolver delegates to provider. |
| Statistics provider | Pass | Pass | Pass | Pass | Uses ledger store, aggregate builder, and enricher. |
| Ledger store | Pass | Pass | Pass | Pass | Uses SQL repository and run-summary adapter; provider must not bypass store. |
| Aggregate builder | Pass | Pass | Pass | Pass | Shared aggregation owner; no row identity. |
| Run-summary adapter | Pass | Pass | Pass | Pass | Focused summary only. |
| Run-history enricher | Pass | Pass | Pass | Pass | Uses public run-history services. |
| Frontend settings components | Pass | Pass | Pass | Pass | No direct Apollo bypass and no local price math. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `TokenUsageStatisticsProvider` | Pass | Pass | Pass | Pass | Authoritative historical projection owner. |
| `TokenUsageLedgerStore` | Pass | Pass | Pass | Pass | SQL repository stays internal. |
| `TokenUsageCostSummaryAggregateBuilder` | Pass | Pass | Pass | Pass | Aggregation helpers stay behind the aggregate function. |
| `TokenUsageRunSummaryAdapter` | Pass | Pass | Pass | Pass | Existing focused summary mapping does not leak into diagnostics. |
| Run-history catalog/metadata services | Pass | Pass | Pass | Pass | Enricher does not read raw stores directly. |
| `tokenUsageStatistics` frontend store | Pass | Pass | Pass | Pass | Components use store actions/state. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `buildTokenUsageCostSummaryAggregate(events)` | Pass | Pass | Pass | Low | Pass |
| `buildTokenUsageRunSummary({ runId, rootTeamRunIdOverride?, events })` | Pass | Pass | Pass | Low | Pass |
| `TokenUsageStatisticsProvider.getTaskStatisticsInPeriod(startDate, endDate)` | Pass | Pass | Pass | Low | Pass |
| `TokenUsageStatisticsProvider.getStatisticsPerRuntimeModel(startDate, endDate)` | Pass | Pass | Pass | Low | Pass |
| `tokenUsageTaskStatisticsInPeriod(startTime, endTime)` | Pass | Pass | Pass | Low | Pass |
| `usageStatisticsInPeriod(startTime, endTime)` as runtime/model diagnostics | Pass | Pass | Pass | Low | Pass |
| Focused run/team/member summary queries | Pass | Pass | Pass | Low | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/token-usage/projections/` | Pass | Pass | Low | Pass | Good placement for aggregate and adapter projection files. |
| `autobyteus-server-ts/src/token-usage/providers/` | Pass | Pass | Low | Pass | Provider/enricher placement is coherent. |
| `autobyteus-server-ts/src/token-usage/domain/statistics-models.ts` | Pass | Pass | Low | Pass | DTO contracts belong in token-usage domain. |
| `autobyteus-server-ts/src/api/graphql/types/token-usage-stats.ts` | Pass | Pass | Medium | Pass | Existing large transport file; keep additions mapping-only. |
| `autobyteus-web/components/settings/token-usage/` | Pass | Pass | Low | Pass | Good split for task/model/details components. |
| `autobyteus-web/types/tokenUsageStatistics.ts` | Pass | Pass | Low | Pass | UI-specific row/sort/expansion types. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Ledger event period listing | Pass | Pass | N/A | Pass | Existing period read is acceptable for MVP. |
| Cache-aware aggregation | Pass | Pass | Pass | Pass | Extracting identity-free aggregate tightens the existing policy. |
| Focused run summary behavior | Pass | Pass | Pass | Pass | Adapter preserves public summary shape without polluting aggregate core. |
| Run/team metadata | Pass | Pass | Pass | Pass | Reuse public run-history services via enricher. |
| GraphQL token usage transport | Pass | Pass | N/A | Pass | Existing resolver can be extended. |
| Frontend token formatting | Pass | Pass | N/A | Pass | Existing formatter is reused/extended. |
| Settings stats UI | Pass | Pass | Pass | Pass | Split shell/tables/details. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Model-only grouping | No | Pass | Pass | Replace with runtime/model grouping. |
| Old model-only Settings default | No | Pass | Pass | Replace with `By Task` default. |
| Old prompt/assistant UI labels | No | Pass | Pass | Rename to input/output. |
| Fake range-mode control | No | Pass | Pass | Static MVP label only; future mode stays out of scope. |
| Runtime/model run-summary pseudo identity | No | Pass | Pass | Explicitly rejected. |
| Ledger schema/cost formula compatibility | No new compatibility path | Pass | Pass | No migration/formula change planned. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Aggregate extraction | Pass | Pass | Pass | Pass |
| Run-summary adapter and ledger-store delegation | Pass | Pass | Pass | Pass |
| Provider task/runtime-model extension | Pass | Pass | Pass | Pass |
| GraphQL schema/query update | Pass | Pass | Pass | Pass |
| Frontend split and generated types | Pass | Pass | Pass | Pass |
| Localization/docs | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| By Task hierarchy and no double counting | Yes | Pass | Pass | Pass | Requirements examples are clear. |
| Expanded member rows | Yes | Pass | Pass | Pass | Member attachment and cost sum behavior are explicit. |
| Created-time fallback | Yes | Pass | Pass | Pass | `First usage observed` is clear. |
| Runtime/model diagnostics | Yes | Pass | Pass | Pass | Runtime/model split is clear. |
| MVP range semantics | Yes | Pass | Pass | Pass | Static label vs fake selector is now explicit. |
| Identity-free aggregate vs run-summary adapter | Yes | Pass | Pass | Pass | Good/bad examples are present and actionable. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Large date ranges may be slow | Existing stats read period events in memory. | Defer repository-level grouping unless implementation profiling shows it is necessary. | Accepted residual risk. |
| Legacy metadata gaps | Legacy rows may lack runtime/run-history details. | Use `Unknown` and `First usage observed` fallbacks as designed. | Accepted residual risk. |
| Nested team/member paths | Member hierarchy display may need careful formatting. | Use member path/route key guidance; expand only if current data requires it. | Accepted residual risk. |

## Review Decision

- `Pass`: the design is ready for implementation.

## Findings

None.

## Classification

N/A — no unresolved findings.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- MVP answers `Usage during period`, not full task lifetime cost; the static help text must remain visible.
- Existing period reads are in-memory and may require future repository grouping for very large ranges.
- Legacy/missing metadata fallbacks must be implemented exactly as designed to avoid misleading chronology.
- GraphQL generated types and localization generated files may need project-specific regeneration commands.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: Round 2 resolves AR-001 and AR-002. The design is actionable in the current codebase and ready for implementation.
