# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/token-statistics-run-team-analysis/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/token-statistics-run-team-analysis/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/token-statistics-run-team-analysis/design-spec.md`
- Current Review Round: 5
- Trigger: Round 5 final field-policy package after the user clarified that Settings > Token Statistics is a usage/cost report, not a live roster viewer, and that self-contained historical statistics require only five new display fields on top of existing ledger facts.
- Prior Review Round Reviewed: Round 4 was paused with no active pass/fail decision. Round 3's pass was suspended after deeper self-contained-data discussion. Round 5 supersedes the Round 3 roster-complete/no-usage direction and the Round 4 broader display-context direction.
- Latest Authoritative Round: 5
- Current-State Evidence Basis:
  - Requirements now state usage-derived team expansion and five-field display policy: `teamName`, `agentName`, `runSummary`, `runCreatedAt`, `memberName`.
  - Design spec identifies existing ledger fields to reuse for run/team/member grouping, paths, runtime/model, tokens, cache, reasoning, costs, currency, status, and missing-price dimensions.
  - Round 5 rework note explicitly rejects no-usage roster rows, `periodUsageState`, roster order, member created time, configured no-usage runtime/model, workspace/source-node/full-definition fields, generic snapshot/display-context blobs, and runtime/model duplication.
  - UI prototype and behavior matrix now show usage-derived member expansion only, compact `Usage during period`, and `Created Time` as the last visible `By Task` column.
  - Current worktree history/probe evidence remains useful as why this was clarified, but the authoritative product behavior is now Round 5.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial design handoff | N/A | AR-001, AR-002 | Fail | No | MVP range-mode UI conflict and run-summary-specific aggregate reuse. |
| 2 | Rework for AR-001/AR-002 | AR-001, AR-002 | None | Pass | No | Range UI and identity-free aggregate design were fixed. |
| 3 | Post-user-verification roster-complete rework | AR-001, AR-002 | None | Pass, later suspended | No | Later user discussion superseded roster-complete/no-usage-member semantics. |
| 4 | Self-contained display-context proposal | AR-001, AR-002, Round 3 suspension | Not finalized | Paused | No | User clarified runtime/model and field-addition policy before a decision. |
| 5 | Final self-contained field policy | AR-001, AR-002, Round 3/4 supersessions | None | Pass | Yes | Usage-derived member rows and five-field display policy are design-ready. |

## Reviewed Design Spec

Round 5 defines the authoritative target:

- `By Task` remains the default view and shows one top-level row per standalone agent run or root team run.
- Expanded team rows are **usage-derived**: child rows are selected-period member usage groups keyed by `memberAgentRunId` first, then `memberRouteKey`.
- The Settings statistics page is not a roster viewer; inactive/no-usage roster members are omitted in MVP.
- The design reuses existing ledger fields for grouping, paths, runtime/model, token/cache/reasoning, costs, currency/status, and missing-price dimensions.
- The only new self-contained persisted display fields are `teamName`, `agentName`, `runSummary`, `runCreatedAt`, and `memberName`.
- Runtime/model diagnostics still group by explicit runtime/model identity and compose the identity-free aggregate.
- The provider remains the authoritative statistics projection owner; GraphQL maps provider DTOs only.
- Display-field capture/backfill is a token-usage-owned concern that may read run-history/team metadata as a source, but Settings statistics should not do permanent live metadata joins for labels once fields are captured.
- Round 3/4 roster/no-usage implementation artifacts are explicitly correction targets to remove/tighten.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Requirements and design spec classify the task as a feature/product UX improvement with targeted projection refactor and data-shape tightening. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | Design identifies shared-structure looseness for runtime/model diagnostics and boundary/ownership risk if historical labels depend on mutable run-history metadata. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Design says targeted refactor is needed: aggregate extraction, task/runtime-model projections, five persisted display fields, and removal of roster/no-usage artifacts. | None. |
| Refactor decision is supported by concrete design sections or residual-risk rationale | Pass | Spine inventory, ownership map, removal plan, boundary map, interface map, migration sequence, examples, and UI matrix all reflect Round 5 policy. | None. |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | AR-001 | High | Resolved | Requirements/design/UI still specify compact `Usage during period` only, with no range-mode selector, no `Tasks created in period`, and no `rangeMode` argument. | Remains resolved in Round 5. |
| 1 | AR-002 | Medium | Resolved | Design keeps `TokenUsageCostSummaryAggregate` identity-free and forbids `TokenUsageRunSummaryPayload` reuse for runtime/model diagnostics. | Remains resolved in Round 5. |
| 3 | PUV-ROSTER | N/A | Superseded/obsolete | Round 5 states Settings Token Statistics is a usage/cost report, not a roster viewer; usage-derived rows may omit inactive/no-usage members. | No longer an implementation requirement. |
| 4 | Broad display-context direction | N/A | Superseded/obsolete | Round 5 replaces broad context rows with exactly five display fields and existing ledger runtime/model/path fields. | No active Round 4 decision remains. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | `By Task` usage/cost statistics | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Runtime/model diagnostics | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Identity-free aggregate core | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-004 | Focused run-summary adapter | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-005 | Five-field display capture/backfill | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `token-usage/providers` | Pass | Pass | Pass | Pass | Correct owner for statistics provider, ledger store, and display-field capturer. |
| `token-usage/projections` | Pass | Pass | Pass | Pass | Correct owner for identity-free aggregate and run-summary adapter. |
| `token-usage/domain` | Pass | Pass | Pass | Pass | Correct owner for task/member/runtime-model DTO contracts. |
| Run-history metadata services | Pass | Pass | Pass | Pass | Reused only as capture/backfill source for five fields, not as normal Settings statistics source. |
| GraphQL token-usage boundary | Pass | Pass | Pass | Pass | Transport mapping only; no ledger/run-history assembly. |
| Frontend Settings token-usage UI | Pass | Pass | Pass | Pass | Page shell/table split remains appropriate and display-only. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Token/cost/cache aggregation | Pass | Pass | Pass | Pass | Identity-free aggregate prevents duplicated math and false row identity. |
| Focused summary adapter | Pass | Pass | Pass | Pass | Existing focused APIs keep run/team/member identity by composition. |
| Five persisted display fields | Pass | Pass | Pass | Pass | Tight field set is explicit and not a generic snapshot/context blob. |
| Runtime/model grouping key | Pass | N/A | Pass | Pass | Explicit runtime/model pair identity avoids model-only collapse. |
| Existing path fields for nested display | Pass | N/A | Pass | Pass | Reuse existing `teamRunPathJson`/`memberPathJson`; no new hierarchy structure. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `TokenUsageCostSummaryAggregate` | Pass | Pass | Pass | Pass | Pass | Contains metric/cost/cache/status data only; no row identity. |
| `TokenUsageTaskStatisticsRow` | Pass | Pass | Pass | Pass | Pass | Explicit row identity plus aggregate and display fields. |
| `TokenUsageTaskMemberStatisticsRow` | Pass | Pass | Pass | Pass | Pass | Explicit member usage identity, existing path, `memberName`, aggregate; no no-usage state. |
| `TokenUsageRuntimeModelStatisticsRow` | Pass | Pass | Pass | Pass | Pass | Explicit `{ runtimeKind, modelIdentifier }` identity plus aggregate. |
| Five display fields | Pass | Pass | Pass | Pass | Pass | Field policy is narrow: `teamName`, `agentName`, `runSummary`, `runCreatedAt`, `memberName`. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Model-only grouping | Pass | Pass | Pass | Pass | Replace with runtime/model grouping. |
| Monolithic private `TokenUsageLedgerStore.buildSummary` | Pass | Pass | Pass | Pass | Replace with aggregate core and run-summary adapter. |
| Model-only Settings default | Pass | Pass | Pass | Pass | Replace with task-first tabs. |
| Fake range mode / `rangeMode` | Pass | Pass | Pass | Pass | Compact static range label only. |
| No-usage roster expansion | Pass | Pass | Pass | Pass | Replace with usage-derived member rows. |
| Roster-backed paused implementation artifacts | Pass | Pass | Pass | Pass | Remove/tighten `listTeamAgentMemberRoster`, roster DTOs, no-usage aggregate path, `periodUsageState`, workspace display fields, roster order, configured no-usage runtime/model, and member created time from Settings stats shape. |
| Broad display-context/snapshot fields | Pass | Pass | Pass | Pass | Exactly five fields; no generic snapshot/display-context blob. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `token-usage/projections/token-usage-cost-summary-aggregate.ts` | Pass | Pass | Pass | Pass | Identity-free aggregate only. |
| `token-usage/projections/token-usage-run-summary-adapter.ts` | Pass | Pass | Pass | Pass | Focused summary adapter only. |
| `token-usage/domain/statistics-models.ts` | Pass | Pass | Pass | Pass | Task/member/runtime-model DTOs, without no-usage/member-created-time fields. |
| `token-usage/providers/token-usage-display-field-capturer.ts` or tightened `token-usage-run-history-enricher.ts` | Pass | Pass | Pass | Pass | Exactly five display fields; no roster/workspace/full-definition responsibilities. |
| `token-usage/providers/statistics-provider.ts` | Pass | Pass | Pass | Pass | Historical grouping, no-double-counting, usage-derived team expansion, runtime/model grouping. |
| `token-usage/providers/token-usage-ledger-store.ts` | Pass | Pass | Pass | Pass | Ledger read/write boundary; focused summaries delegate to adapter; persistence includes five fields. |
| GraphQL and frontend query/store/table files | Pass | Pass | N/A | Pass | Mapping/state/rendering only. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| GraphQL resolver | Pass | Pass | Pass | Pass | Delegates to provider; no direct repository/run-history assembly. |
| Statistics provider | Pass | Pass | Pass | Pass | Uses ledger store and aggregate builder; owns projection grouping. |
| Ledger store | Pass | Pass | Pass | Pass | Uses SQL repository, display-field capturer, and run-summary adapter. |
| Display-field capturer | Pass | Pass | Pass | Pass | May read public run-history services only to populate five fields. |
| Frontend components | Pass | Pass | Pass | Pass | No local cost math or metadata joins. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `TokenUsageStatisticsProvider` | Pass | Pass | Pass | Pass | Authoritative owner for Settings historical projections. |
| `TokenUsageLedgerStore` | Pass | Pass | Pass | Pass | Ledger repository stays internal. |
| `TokenUsageDisplayFieldCapturer` | Pass | Pass | Pass | Pass | Run-history source reads stay capture/backfill-only. |
| `TokenUsageCostSummaryAggregateBuilder` | Pass | Pass | Pass | Pass | Aggregation policy remains shared and encapsulated. |
| `tokenUsageStatistics` frontend store | Pass | Pass | Pass | Pass | Components use store/query state. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `buildTokenUsageCostSummaryAggregate(events)` | Pass | Pass | Pass | Low | Pass |
| `buildTokenUsageRunSummary({ runId, rootTeamRunIdOverride?, events })` | Pass | Pass | Pass | Low | Pass |
| `TokenUsageDisplayFieldCapturer.capture(payload, context)` or equivalent | Pass | Pass | Pass | Low | Pass |
| `TokenUsageStatisticsProvider.getTaskStatisticsInPeriod(startDate, endDate)` | Pass | Pass | Pass | Low | Pass |
| `TokenUsageStatisticsProvider.getStatisticsPerRuntimeModel(startDate, endDate)` | Pass | Pass | Pass | Low | Pass |
| `tokenUsageTaskStatisticsInPeriod(startTime, endTime)` | Pass | Pass | Pass | Low | Pass |
| `usageStatisticsInPeriod(startTime, endTime)` | Pass | Pass | Pass | Low | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/token-usage/projections/` | Pass | Pass | Low | Pass | Good placement for aggregate and adapter. |
| `autobyteus-server-ts/src/token-usage/providers/` | Pass | Pass | Low | Pass | Good placement for stats provider, ledger store, and display-field capturer. |
| `autobyteus-server-ts/src/token-usage/domain/` | Pass | Pass | Low | Pass | Good placement for DTO contracts. |
| `autobyteus-server-ts/src/api/graphql/types/` | Pass | Pass | Medium | Pass | Existing transport file; keep mapping-only. |
| `autobyteus-web/components/settings/token-usage/` | Pass | Pass | Low | Pass | Good task/model/detail UI split. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Period ledger events | Pass | Pass | N/A | Pass | Existing period reads remain MVP basis. |
| Runtime/model/path fields | Pass | Pass | N/A | Pass | Existing ledger fields are reused rather than duplicated. |
| Token/cost/cache aggregation | Pass | Pass | Pass | Pass | Existing private policy extracted, not reimplemented. |
| Display labels | Pass | Pass | Pass | Pass | Run-history metadata reused only as source for five captured fields. |
| Frontend formatting | Pass | Pass | N/A | Pass | Existing formatting can be extended display-only. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Model-only default view | No | Pass | Pass | Replaced by task-first tabs. |
| Model-only grouping | No | Pass | Pass | Runtime/model grouping is clean-cut for diagnostics. |
| Roster/no-usage member behavior | No | Pass | Pass | Removed from MVP Settings statistics. |
| Broad display context | No | Pass | Pass | Replaced by exactly five fields. |
| Legacy rows missing display fields | Yes | Pass | Pass | Explicit best-effort fallback to `Unknown` / `First usage observed`; not a dual source for normal rows. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Aggregate extraction and run-summary adapter | Pass | Pass | Pass | Pass |
| Add five nullable display fields to persistence and payload mapping | Pass | Pass | Pass | Pass |
| Display-field capture/backfill | Pass | Pass | Pass | Pass |
| Provider task/runtime-model grouping | Pass | Pass | Pass | Pass |
| Remove roster/no-usage DTO/API/UI artifacts | Pass | Pass | Pass | Pass |
| GraphQL/frontend generated type updates | Pass | Pass | Pass | Pass |
| Docs and localization update | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Usage-derived team expansion | Yes | Pass | Pass | Pass | Requirements AC-023 and UI matrix cover the six-roster/one-usage case as usage-derived. |
| Five display fields | Yes | Pass | Pass | Pass | Design examples show good five-field persistence and bad broad metadata shape. |
| Runtime/model diagnostics | Yes | Pass | Pass | Pass | Good/bad examples reject pseudo run IDs and run-summary payload reuse. |
| Nested path handling | Yes | Pass | Pass | Pass | Existing `memberPathJson` example is clear enough for MVP. |
| Compact range semantics | Yes | Pass | Pass | Pass | UI matrix and spec reject paragraph/box/dropdown. |
| Created Time last column | Yes | Pass | Pass | Pass | Requirements and UI behavior matrix cover it. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Legacy rows missing five display fields and missing live metadata | Cannot reconstruct names/created time after metadata is gone. | Use explicit fallback labels; no broader metadata recovery in MVP. | Accepted residual risk. |
| Large date ranges | Current design still reads period events in memory. | Keep MVP approach; optimize repository grouped reads later if needed. | Accepted residual risk. |
| Full task-created-period mode / CSV export | Useful future reporting features. | Remain out of scope. | Deferred. |
| Duplicate DS-003 row in design spec spine inventory | Editorial duplication only. | Implementation can ignore; optional cleanup by designer/implementer. | Non-blocking. |

## Review Decision

- `Pass`: the Round 5 revised design is ready for implementation.

## Findings

None.

## Classification

No open architecture findings. Round 5 resolves the active field-policy ambiguity and supersedes the roster/no-usage member semantics from earlier rounds.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Implementation must actively remove/tighten paused roster-backed artifacts (`listTeamAgentMemberRoster`, roster DTOs, no-usage aggregate path, `periodUsageState`, workspace display fields, member created time, roster order, configured no-usage runtime/model) from the Settings statistics shape.
- Display-field capture should remain exactly five fields; adding more requires a new requirement.
- If a grouped row has inconsistent display field values across events, implementation should choose a deterministic non-null value and preserve fallback labeling for missing `runCreatedAt`.
- Existing ledger fields such as runtime/model/path/token/cost facts should be reused rather than renamed or duplicated.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: Proceed to implementation using Round 5 as the authoritative design. Round 3 roster-complete/no-usage semantics and Round 4 broad display-context semantics are superseded.
