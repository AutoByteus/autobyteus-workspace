# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-nested-task-runs/tickets/done/token-statistics-nested-task-runs/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-nested-task-runs/tickets/done/token-statistics-nested-task-runs/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-nested-task-runs/tickets/done/token-statistics-nested-task-runs/design-spec.md`
- Current Review Round: 1
- Trigger: Superseding design handoff after user-approved self-contained Token Usage `execution_address_json` direction.
- Prior Review Round Reviewed: N/A. Earlier handoffs were superseded before an authoritative review report was written.
- Latest Authoritative Round: 1
- Current-State Evidence Basis: Reviewed the updated requirements, investigation notes, design spec, and representative current code paths for member team context creation, token usage enrichment, token usage payload/repository/schema, statistics provider/model, GraphQL/client task statistics, and mixed task-team/task-agent launch paths.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Superseding `execution_address_json` design package | N/A | No blocking findings | Pass | Yes | This report treats earlier task-record-query and task-ledger-column designs as superseded. |

## Reviewed Design Spec

The reviewed design replaces fragmented Token Usage hierarchy fields with a Token Usage-owned canonical execution address persisted as `token_usage_ledger_events.execution_address_json`, while keeping `root_team_run_id` as the scalar root grouping key. Backend Token Usage statistics builds recursive `children` rows from ledger-owned data only. Task records, memory paths, live runtime managers, and frontend state are forbidden as Task statistics hierarchy inputs.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Design classifies the work as behavior change / feature with data-model cleanup and API/UI refactor. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | Design cites shared structure looseness and boundary/ownership issues, supported by observed unpopulated `team_run_path_json`, local-only `member_path_json`, child task-team roots, and member-only API shape. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Design states refactor is needed now and names the structural replacements: `execution_address_json` plus recursive `children`. | None. |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Removal plan, file mapping, interface boundaries, dependency rules, and migration sequence reflect the refactor decision. Historical rows without addresses are intentionally deferred to fallback rather than guessed. | None. |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | No prior authoritative design review findings exist for this ticket. | Earlier solution packages were superseded before review completion. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Producer-side runtime/enrichment to persisted ledger event | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Ledger query to backend recursive Task statistics | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | GraphQL result to frontend recursive table | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Bounded local execution-address-to-tree build | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-005 | Bounded local legacy/no-address fallback | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Agent team execution runtime context | Pass | Pass | Pass | Pass | Correct owner for constructing the runtime execution scope while parent/task identities are still available. |
| Token Usage domain | Pass | Pass | Pass | Pass | Correct owner for persisted execution address snapshot and statistics row contracts. |
| Token Usage persistence | Pass | Pass | Pass | Pass | `execution_address_json` belongs in the existing ledger event table; old path fields are decommissioned as hierarchy authority. |
| Token Usage statistics projection | Pass | Pass | Pass | Pass | Correct owner for address parsing, row tree construction, aggregate roll-up, and fallback grouping. |
| GraphQL API | Pass | Pass | Pass | Pass | Transport-only mapping from provider result. |
| Frontend settings Token Statistics | Pass | Pass | Pass | Pass | Display-only recursive rendering; no hierarchy reconstruction. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Execution address parsing/serialization/stable key | Pass | Pass | Pass | Pass | `token-usage/domain/execution-address.ts` is the right owner for persisted Token Usage address semantics. |
| Runtime execution scope construction | Pass | Pass | Pass | Pass | Runtime builder is justified because the hierarchy is known at launch/context time. |
| Recursive task row model | Pass | Pass | Pass | Pass | Replaces the obsolete separate member child type. |
| Recursive frontend normalizer | Pass | Pass | Pass | Pass | Acceptable as client transport normalization, not hierarchy building. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `TokenUsageExecutionAddress` | Pass | Pass | Pass | Pass | Root id remains outside the JSON; ordered segments carry hierarchy only. |
| `TokenUsageExecutionScope` | Pass | Pass | Pass | Pass | Separates root id, containing scope address, and current run address without keeping path arrays as parallel authority. |
| `TokenUsageTaskStatisticsRow` | Pass | Pass | Pass | Pass | One recursive row type with `children` and row-kind-specific identity fields is acceptable. |
| Ledger row identity | Pass | Pass | Pass | N/A | `root_team_run_id + execution_address_json` is a tight authoritative pair; scalar member/task fields are display/filter metadata only. |
| GraphQL API model | Pass | Pass | Pass | N/A | Clean-cut `children` replacement controls compatibility pressure. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `team_run_path_json` active use | Pass | Pass | Pass | Pass | Physical drop may be sequenced; active hierarchy use must stop in this change. |
| `member_path_json` active use | Pass | Pass | Pass | Pass | Same stance as `team_run_path_json`. |
| Payload `team_run_path` / `member_path` as hierarchy fields | Pass | Pass | Pass | Pass | Replaced by `execution_address`; scalar route/run fields may remain for non-hierarchy use. |
| GraphQL run-summary `teamRunPath` / `memberPath` | Pass | Pass | Pass | Pass | Design explicitly calls for removal/replacement with `executionAddress` where execution identity is still exposed. |
| `TokenUsageTaskMemberStatisticsRow` | Pass | Pass | Pass | Pass | Member rows become `rowKind: MEMBER_RUN` in recursive row model. |
| GraphQL Task row `members` field | Pass | Pass | Pass | Pass | No dual active `members + children` path. |
| Frontend `row.members` rendering | Pass | Pass | Pass | Pass | Recursive renderer over `children`. |
| `memberGroupKey` grouping authority | Pass | Pass | Pass | Pass | Replaced by execution-address tree builder. |
| Query-time task-record attribution | Pass | Pass | Pass | Pass | Superseded and explicitly rejected. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/token-usage/domain/execution-address.ts` | Pass | Pass | Pass | Pass | Token Usage value object, parsing, canonicalization, stable keys. |
| `autobyteus-server-ts/src/agent-team-execution/services/token-usage-execution-address-builder.ts` | Pass | Pass | Pass | Pass | Runtime scope construction only; must not include statistics logic. |
| `autobyteus-server-ts/src/agent-team-execution/domain/member-team-context.ts` | Pass | Pass | N/A | Pass | Correct carrier to agent run config. |
| `autobyteus-server-ts/src/agent-team-execution/services/member-team-context-builder.ts` | Pass | Pass | N/A | Pass | Correct context construction point. |
| `autobyteus-server-ts/src/agent-execution/events/processors/token-usage/token-usage-context-enricher.ts` | Pass | Pass | N/A | Pass | Copies scope into payload; must not reconstruct from task records or memory. |
| `autobyteus-server-ts/src/agent-execution/domain/agent-run-token-usage.ts` | Pass | Pass | Pass | Pass | Payload contract/parser owner. |
| `autobyteus-server-ts/prisma/schema.prisma` + migration | Pass | Pass | N/A | Pass | Persistence schema owner. |
| `autobyteus-server-ts/src/token-usage/repositories/sql/token-usage-ledger-repository.ts` | Pass | Pass | Pass | Pass | Serialization/mapping only; no tree policy. |
| `autobyteus-server-ts/src/token-usage/providers/task-statistics-tree-builder.ts` | Pass | Pass | Pass | Pass | Internal projection owner. |
| `autobyteus-server-ts/src/token-usage/providers/statistics-provider.ts` | Pass | Pass | Pass | Pass | Public use-case boundary. |
| `autobyteus-server-ts/src/api/graphql/types/token-usage-stats.ts` | Pass | Pass | N/A | Pass | Transport mapper only. |
| `autobyteus-web/types/tokenUsageStatistics.ts` | Pass | Pass | N/A | Pass | Client row types. |
| `autobyteus-web/stores/tokenUsageStatistics.ts` | Pass | Pass | N/A | Pass | Recursive normalization, not hierarchy construction. |
| `autobyteus-web/graphql/queries/token_usage_statistics_queries.ts` | Pass | Pass | N/A | Pass | Recursive query selection. |
| `autobyteus-web/components/settings/token-usage/TokenUsageTaskStatisticsTable.vue` | Pass | Pass | N/A | Pass | Display-only recursive rendering. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Runtime context setup | Pass | Pass | Pass | Pass | May build execution scope; must not own statistics or persistence. |
| Token Usage domain/persistence | Pass | Pass | Pass | Pass | Owns snapshot and mapping; does not query task records for hierarchy. |
| Token Usage statistics provider | Pass | Pass | Pass | Pass | Owns tree projection from ledger events only. |
| GraphQL API | Pass | Pass | Pass | Pass | Calls provider, does not reconstruct or join. |
| Frontend | Pass | Pass | Pass | Pass | Renders `children`; no task-record/name/timestamp inference. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `TokenUsageStatisticsProvider.getTaskStatisticsInPeriod` | Pass | Pass | Pass | Pass | Tree builder/parser are internal behind provider. |
| Runtime context setup / `MemberTeamContextBuilder` | Pass | Pass | Pass | Pass | Enricher consumes the scope instead of deriving ancestry. |
| `TokenUsageLedgerRepository` | Pass | Pass | Pass | Pass | Repository maps domain payloads to Prisma rows; provider should not parse raw Prisma columns. |
| Backend recursive row API | Pass | Pass | Pass | Pass | Frontend receives ready tree. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `TokenUsageContextEnricher.enrich` | Pass | Pass | Pass | Low | Pass |
| `TokenUsageLedgerRepository` mapping | Pass | Pass | Pass | Low | Pass |
| `TokenUsageStatisticsProvider.getTaskStatisticsInPeriod` | Pass | Pass | Pass | Low | Pass |
| `TokenUsageTaskStatisticsTreeBuilder.build` | Pass | Pass | Pass | Low | Pass |
| GraphQL `tokenUsageTaskStatisticsInPeriod` | Pass | Pass | Pass | Low | Pass |
| Frontend task statistics query/table props | Pass | Pass | Pass | Low | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `token-usage/domain` | Pass | Pass | Low | Pass | Address and statistics contracts. |
| `token-usage/providers` | Pass | Pass | Low | Pass | Provider and tree projection. |
| `token-usage/repositories/sql` | Pass | Pass | Low | Pass | SQL mapping only. |
| `agent-team-execution/services` | Pass | Pass | Medium | Pass | Medium risk noted but controlled by must-not-contain guidance. |
| `api/graphql/types` | Pass | Pass | Low | Pass | Transport. |
| `autobyteus-web/components/settings/token-usage` | Pass | Pass | Low | Pass | UI display. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Ordered typed address segments | Pass | Pass | Pass | Pass | Reuses conversation/task address semantics while keeping Token Usage's persisted snapshot owned by Token Usage. |
| Runtime task address construction examples | Pass | Pass | Pass | Pass | Token-specific builder is justified because task-delegation address builder is message/task-record oriented. |
| Token event persistence | Pass | Pass | N/A | Pass | Extend existing repository/schema. |
| Cost aggregate calculation | Pass | Pass | N/A | Pass | Aggregate math remains unchanged. |
| Task statistics use-case | Pass | Pass | Pass | Pass | Existing provider remains public owner. |
| Frontend statistics store/table | Pass | Pass | N/A | Pass | Existing display area extended. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| `members` API | No | Pass | Pass | Replaced by `children`. |
| Old hierarchy path fields | No active hierarchy compatibility path | Pass | Pass | Legacy no-address fallback is data visibility only, not competing hierarchy authority. |
| Task-record query-time hierarchy | No | Pass | Pass | Explicitly rejected. |
| Frontend hierarchy reconstruction | No | Pass | Pass | Explicitly forbidden. |
| Extra scalar task-team hierarchy columns | No | Pass | Pass | Task-team run id lives inside address segment. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Address domain + runtime scope before enrichment | Pass | Pass | Pass | Pass |
| Prisma/repository migration | Pass | Pass | Pass | Pass |
| Statistics row/tree replacement | Pass | Pass | Pass | Pass |
| GraphQL/client replacement | Pass | Pass | Pass | Pass |
| Legacy/no-address fallback | Pass | Pass | Pass | Pass |
| Physical column drop contingency | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Direct member event | Yes | Pass | Pass | Pass | Shows same address model for simple case. |
| Task-team child event | Yes | Pass | Pass | Pass | Directly addresses screenshot failure. |
| Task-agent event | Yes | Pass | Pass | Pass | Clarifies delegated task-agent row placement. |
| Nested task-agent inside task-team | Yes | Pass | Pass | Pass | Ordered-prefix parentage is clear. |
| Backend/API/UI split | Yes | Pass | Pass | Pass | Clearly forbids frontend/task-record reconstruction. |
| Execution-node scanning rule | Yes | Pass | N/A | Pass | Sufficiently concrete for implementation. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| None blocking | The design covers direct members, task-team child members, task agents, nested task executions, multiple same-target executions, standalone agent runs, and legacy no-address rows. | N/A | Closed for implementation. |

## Review Decision

Pass: the design is ready for implementation.

## Findings

None.

## Classification

N/A — no blocking `Design Impact`, `Requirement Gap`, or `Unclear` findings.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Runtime propagation must audit every team member, task-team child member, task-agent, restore/recover, and nested execution creation path; a missing propagation path would produce legacy fallback rows for new data.
- Display labels for task-team/task-agent rows may be incomplete until address-derived labels and explicit row-kind/short-id fallbacks are implemented.
- GraphQL recursive query depth must be chosen/documented so deeply nested task trees degrade predictably.
- Physical dropping of old SQLite/Prisma columns may need careful migration sequencing; if not physically dropped in this change, active code must still stop treating them as hierarchy authority and a cleanup follow-up must be recorded.
- Live Token Meter surfaces still using scalar member fields must be preserved as non-hierarchy filtering/display behavior.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: The design answers the requested review points affirmatively: Token Usage is the correct owner for the persisted execution-address snapshot and backend projection; task records are not a query-time dependency; the proposed runtime scope/address propagation is sufficient if all creation paths are audited; the decommission plan is clean for old path fields and `members`; and the row construction rule for member/task segment pairs is sound. No implementation-blocking ambiguity remains.
