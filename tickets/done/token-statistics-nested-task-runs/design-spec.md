# Design Spec

## Current-State Read

The ticket branch is based on latest `origin/personal` at `f4e39308347c41f824c12d548ce0c07f06c6e4f9` after a 2026-07-02 refresh. The latest base includes the task-delegation record refactor and token meter unit-price work, but Token Usage Task statistics still uses the older hierarchy model.

Current Token Usage path:

`runtime/provider usage event -> TokenUsageContextEnricher -> TokenUsageLedgerStore/Repository -> token_usage_ledger_events -> TokenUsageStatisticsProvider -> GraphQL tokenUsageTaskStatisticsInPeriod -> tokenUsageStatisticsStore -> TokenUsageTaskStatisticsTable`

Current hierarchy facts:

- `token_usage_ledger_events` still stores partial hierarchy columns: `root_team_run_id`, `team_run_path_json`, `member_agent_run_id`, `member_path_json`, `member_route_key`, and task-agent scalar fields.
- `TokenUsageContextEnricher` sets `root_team_run_id` from the immediate `memberContext.teamRunId`, leaves `team_run_path` as whatever was already in the payload, and sets `member_path` only to the current local member path.
- In observed local data, `team_run_path_json` is not populated at all; `member_path_json` is local-only (`["Teacher"]`, `["student_one"]`, etc.).
- A delegated task-team child can therefore have the child task-team run id as `root_team_run_id` and no parent/root address, which explains the top-level `Unknown team run` shown in the screenshot.
- `TokenUsageTaskStatisticsRow` only supports `TEAM_RUN | AGENT_RUN`, with one separate child shape `TokenUsageTaskMemberStatisticsRow[] members`.
- The settings frontend query/store/table render only top-level rows plus one `members` level.
- Team Communication and Task Delegation already have an ordered typed address shape, `ConversationTargetAddress`, with `member`, `task_team`, and `task_agent` segments. Latest task records persist addresses, but the user explicitly rejected querying task records as Token Statistics hierarchy authority.

Constraint that drives the design: Token Usage must be self-contained. The token usage event row itself must contain the hierarchy address needed for Token Statistics. The backend must build the recursive tree; the frontend must render it without reconstructing relationships.

## Intended Change

Replace the fragmented Token Usage hierarchy representation with a single canonical execution address stored on every new team-context token usage event:

```text
root_team_run_id
execution_address_json
```

`root_team_run_id` is the scalar root grouping/index key. `execution_address_json` is a JSON-text snapshot of the token-producing execution address relative to that root. It uses the same ordered segment semantics as `ConversationTargetAddress`, but it is owned by Token Usage as a persisted attribution snapshot.

Target examples:

```json
{
  "root_team_run_id": "nested_classroom_root",
  "execution_address_json": {
    "segments": [
      { "kind": "member", "memberRouteKey": "Teacher" }
    ]
  }
}
```

```json
{
  "root_team_run_id": "nested_classroom_root",
  "execution_address_json": {
    "segments": [
      { "kind": "member", "memberRouteKey": "StudentStudyGroup" },
      { "kind": "task_team", "taskTeamRunId": "studentstudygroup_e049..." },
      { "kind": "member", "memberRouteKey": "student_one" }
    ]
  }
}
```

```json
{
  "root_team_run_id": "software_engineering_root",
  "execution_address_json": {
    "segments": [
      { "kind": "member", "memberRouteKey": "Codex" },
      { "kind": "task_agent", "taskAgentRunId": "task_agent_run_123" }
    ]
  }
}
```

Backend Token Usage statistics will parse `execution_address_json`, build an execution-node tree, aggregate token/cost totals by descendants, and return recursive `children` rows. The active API/client shape will replace `members` with `children`.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change / Feature with data-model cleanup and API/UI refactor.
- Current design issue found (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Shared Structure Looseness and Boundary Or Ownership Issue.
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes.
- Evidence: Existing path fields are either unpopulated or local-only; Task statistics cannot derive task-team/task-agent ancestry. Current API has a member-only child contract. The user's clarification requires a self-contained token usage row, not query-time task-record joins or frontend reconstruction.
- Design response: Add a Token Usage execution-address snapshot, persist it in `token_usage_ledger_events.execution_address_json`, remove/decommission old path hierarchy fields, and replace member-only statistics rows with a backend-built recursive tree.
- Refactor rationale: Extending `team_run_path_json`/`member_path_json` would standardize failed parallel representations. The clean boundary is one root id plus one ordered execution address.
- Intentional deferrals and residual risk, if any: Historical rows without `execution_address_json` cannot be perfectly nested without guessing. They remain visible through explicit fallback grouping. A separate historical data backfill may be designed later only for deterministic cases.

## Terminology

- `Subsystem` / `capability area`: a larger functional area that owns a broader category of work and may contain multiple files plus optional module groupings.
- `Module`: an optional intermediate grouping inside a subsystem when the codebase benefits from it. Do not use `module` as a synonym for one file or as the default ownership term.
- `Folder` / `directory`: a physical grouping used to organize files and any optional module groupings.
- `File`: one concrete source file and the primary unit where one concrete concern should land.
- `Execution address`: Token Usage's persisted ordered address snapshot for the token-producing execution relative to `root_team_run_id`.
- `Execution node`: A backend statistics tree node derived from an execution address. A task execution node may consume a `member + task_team` or `member + task_agent` segment pair as one displayed row.
- `Hierarchy authority`: The persisted fields that Task statistics may use to build parent/child relationships. After this change, only `root_team_run_id` and `execution_address_json` have that authority.

## Design Reading Order

Read and implement this design from abstract to concrete:

1. Producer-side execution address spine.
2. Persistence and data-model cleanup.
3. Backend statistics tree projection.
4. GraphQL/API shape.
5. Frontend recursive display.
6. Tests and migration/removal sequence.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove/decommission `team_run_path_json`, `member_path_json`, `team_run_path`, `member_path`, and the GraphQL/client `members` Task statistics contract as active hierarchy surfaces.
- Treat removal as first-class design work: the replacement is `execution_address_json` plus recursive `children`.
- Decision rule: Task statistics must not read both old paths and the new execution address as competing active authorities. Legacy rows without an address may be displayed through a clearly named fallback path, but the fallback must not guess parentage or reconstruct task-team lineage.
- Scalar fields such as `member_route_key`, `member_agent_run_id`, and `task_id` may remain only for existing non-hierarchy display/filter use cases such as the live Token Meter. They are not allowed in Task statistics parent/child grouping once `execution_address_json` exists.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Agent/team runtime context creation | Persisted token ledger event | Team execution runtime + Token Usage enrichment | Captures root team and execution address before information is lost. |
| DS-002 | Primary End-to-End | Token ledger event query | Backend recursive Task statistics result | Token Usage statistics provider | Converts self-contained event addresses into rows/aggregates. |
| DS-003 | Primary End-to-End | GraphQL Task statistics query | User-visible Token Statistics table | API + frontend settings UI | Transports and displays backend-built hierarchy without frontend reconstruction. |
| DS-004 | Bounded Local | Execution address segments | Execution-node tree | Token Usage execution tree builder | Determines exact row identity, parentage, sorting, and aggregate containment. |
| DS-005 | Bounded Local | Legacy/no-address event | Fallback row | Token Usage statistics provider | Keeps old data visible without guessing new hierarchy. |

## Primary Execution Spine(s)

- DS-001: `Team/Task runtime launch -> MemberTeamContextBuilder -> TokenUsageExecutionScope -> TokenUsageContextEnricher -> TokenUsageLedgerRepository -> token_usage_ledger_events.execution_address_json`
- DS-002: `TokenUsageLedgerStore.listEventsInPeriod -> TokenUsageExecutionAddressParser -> TokenUsageTaskStatisticsTreeBuilder -> TokenUsageStatisticsProvider -> TokenUsageTaskStatisticsResult`
- DS-003: `GraphQL tokenUsageTaskStatisticsInPeriod -> recursive children payload -> tokenUsageStatisticsStore normalizer -> TokenUsageTaskStatisticsTable recursive renderer`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | When a team member, task agent, or task-team child agent is launched, the runtime context receives a root team id plus the execution address for that concrete token-producing run. Token usage enrichment copies that snapshot into every usage payload before persistence. | `MemberTeamContext`, `TokenUsageExecutionScope`, `TokenUsageContextEnricher`, `TokenUsageLedgerRepository` | Runtime context owns available execution identity; Token Usage owns persistence snapshot. | Address normalization, display-field capture, Prisma migration. |
| DS-002 | The statistics provider fetches ledger rows for the date range, groups by standalone run or root team, parses execution addresses, creates execution nodes, aggregates events into leaves and ancestors, and returns sorted recursive rows. | `TokenUsageStatisticsProvider`, `TokenUsageExecutionAddressParser`, `TokenUsageTaskStatisticsTreeBuilder` | Token Usage statistics provider | Aggregate math, legacy fallback handling, row display metadata. |
| DS-003 | GraphQL exposes the recursive row model; the frontend store normalizes `children` recursively; the table renders the supplied tree with expansion state and cost details. | GraphQL row type, client row type, store normalizer, Vue table | API + frontend settings UI | Query depth/fragments, translations, detail-row expansion. |
| DS-004 | Inside the tree builder, ordered address segments are scanned into displayable execution nodes. A `member + task_team` pair becomes one `TASK_TEAM_RUN` row; a `member + task_agent` pair becomes one `TASK_AGENT_RUN` row; a terminal member segment becomes a `MEMBER_RUN` row. | Address parser, node classifier, trie/tree node | Token Usage tree builder | Stable row ids, invalid-address quality/fallback flags. |
| DS-005 | Events without a valid execution address are still included. They stay in standalone/direct legacy groups and are labeled as fallback/unknown when needed; no task-team parent is guessed. | Legacy event classifier, fallback row builder | Token Usage statistics provider | Safe labels, old data visibility. |

## Spine Actors / Main-Line Nodes

- `MemberTeamContextBuilder`: creates member runtime context and must receive/derive the token usage execution scope.
- `TokenUsageExecutionScope`: token usage attribution snapshot available at runtime: root team id, containing team-scope address, and current run execution address.
- `TokenUsageContextEnricher`: copies the scope into token usage payloads and preserves display fields.
- `TokenUsageLedgerRepository`: persists and reads `execution_address_json` as canonical JSON text.
- `TokenUsageExecutionAddressParser/Normalizer`: validates serialized execution address shape.
- `TokenUsageTaskStatisticsTreeBuilder`: converts address-bearing events into recursive row nodes.
- `TokenUsageStatisticsProvider`: public backend statistics owner that coordinates event fetch, tree build, aggregate calculation, and result sorting.
- `GraphQL Token Usage Stats resolver/types`: transport boundary for the recursive result.
- `TokenUsageTaskStatisticsTable`: frontend display surface for already-structured rows.

## Ownership Map

| Node | Owns |
| --- | --- |
| `MemberTeamContextBuilder` | Runtime member/team identity assembly and propagation of root execution scope into created member contexts. |
| `TokenUsageExecutionScope` | The canonical runtime attribution available to Token Usage for a concrete agent run. |
| `TokenUsageContextEnricher` | Last pre-persistence normalization of token usage event identity, display fields, and quality flags. |
| `TokenUsageLedgerRepository` | SQL/Prisma storage mapping for token usage events; no hierarchy inference. |
| `TokenUsageExecutionAddressParser/Normalizer` | Shape validation, canonical serialization, stable address-key creation. |
| `TokenUsageTaskStatisticsTreeBuilder` | Parent/child construction, node identity, descendant aggregation, invalid/legacy fallback routing. |
| `TokenUsageStatisticsProvider` | Statistics use-case boundary; callers ask it for task rows, not lower-level repositories/tree internals. |
| `GraphQL resolver/types` | API transport shape and field mapping. |
| `Frontend store/table` | Query execution, client type normalization, display state, expansion/details; not hierarchy reconstruction. |

Public facade note: `TokenUsageStatisticsProvider` is the backend public use-case boundary. The new address parser/tree builder are internal owned mechanisms behind it.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| GraphQL `tokenUsageTaskStatisticsInPeriod` | `TokenUsageStatisticsProvider` | Transport-level API endpoint for settings UI. | Hierarchy reconstruction, task-record lookup, or aggregate policy. |
| `TokenUsageTaskStatisticsTable` props | Backend recursive row API | Vue display component. | Parent/child inference from names, IDs, task records, or timestamps. |
| `TokenUsageLedgerStore` | `TokenUsageLedgerRepository` + statistics provider | Persistence access facade. | Address parsing/tree policy. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| `token_usage_ledger_events.team_run_path_json` active use | Unpopulated/incomplete hierarchy field. | `execution_address_json` in `TokenUsageLedgerRepository`. | In This Change | Prefer physical DB drop via Prisma migration if feasible; otherwise remove from active Prisma/domain/API surfaces and schedule physical cleanup explicitly. |
| `token_usage_ledger_events.member_path_json` active use | Local-only path cannot express task ancestry. | `execution_address_json` member segments. | In This Change | Same migration stance as above. |
| Payload fields `team_run_path` / `member_path` as Token Usage hierarchy fields | Parallel representation of the same hierarchy subject. | `execution_address`. | In This Change | Remove from `TokenUsageUpdatedPayload` / `TokenUsageRunSummaryPayload` active hierarchy contract. |
| GraphQL run summary fields `teamRunPath` / `memberPath` | Expose obsolete path hierarchy. | `executionAddress` where a summary needs execution identity. | In This Change | If live Token Meter still needs member filter fields, keep scalar route/run fields separately. |
| `TokenUsageTaskMemberStatisticsRow` as separate child-only model | Cannot represent task-team/task-agent rows. | Recursive `TokenUsageTaskStatisticsRow.children`. | In This Change | Member rows become ordinary rows with `rowKind: MEMBER_RUN`. |
| GraphQL `members` field on Task statistics rows | Encodes obsolete one-level child semantics. | GraphQL recursive `children` field. | In This Change | No dual active `members` + `children` compatibility path. |
| Frontend `row.members` rendering | Prevents arbitrary nesting. | Recursive table row renderer over `children`. | In This Change | Expansion/detail state remains keyed by `rowId`. |
| `memberGroupKey` as Task statistics grouping authority | Merges or misplaces delegated executions. | Execution address tree builder. | In This Change | Scalar member fields may be display hints only. |
| Task-record query-time attribution design | Violates user requirement that Token Statistics is self-contained. | Persisted token usage `execution_address_json`. | In This Change | Earlier design handoff is superseded. |

## Return Or Event Spine(s) (If Applicable)

No asynchronous return/event spine changes are required for token event publication itself. Existing token usage event ingestion remains; only the identity fields in the payload and downstream projection change.

The relevant return path is the query response:

`TokenUsageTaskStatisticsTreeBuilder rows -> TokenUsageStatisticsProvider -> GraphQL resolver -> Apollo client/store -> Vue table`

This path returns a complete recursive tree. No downstream component should call back into task records or memory paths to complete it.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `TokenUsageTaskStatisticsTreeBuilder`
  - Chain: `event.execution_address -> parse/normalize -> scan segments into execution nodes -> insert leaf event -> roll up descendant aggregates -> sort children -> emit rows`
  - Why it matters: This is the core local algorithm that turns a flat event ledger into backend-owned hierarchy.

- Parent owner: `TokenUsageExecutionAddressBuilder` / runtime context setup
  - Chain: `parent execution scope -> target logical member/task instance -> rootTeamRunId + teamScopeAddress + currentRunAddress -> MemberTeamContext -> TokenUsageContextEnricher`
  - Why it matters: Address correctness must be established at launch/enrichment time, not reconstructed later.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Display field capture | DS-001, DS-002 | Token Usage statistics provider | Preserve names, summaries, created times, task ids when available. | Rows need useful labels without querying task records. | Tree builder could start depending on external records or display names as identity. |
| Prisma migration | DS-001 | Token usage repository | Add/drop columns and regenerate client. | Persist new canonical address. | Runtime/statistics code would be forced into dual path. |
| Legacy fallback classifier | DS-005 | Statistics provider | Keep no-address rows visible without guessed parentage. | Historical data exists. | Could become a compatibility hierarchy path if mixed with new address logic. |
| GraphQL recursive selection | DS-003 | Frontend query/store | Request/store recursive children. | GraphQL clients need explicit nested fields. | Frontend could start rebuilding missing levels. |
| Formatting/translations | DS-003 | Vue table | User-facing labels for row kinds and metadata. | New row kinds require display copy. | Display concerns could leak into backend identity construction. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Ordered typed address segments | `agent-team-execution/domain/conversation-target-address.ts` | Reuse/Extend structurally | Existing `member`/`task_team`/`task_agent` semantics match the needed address shape. | N/A |
| Runtime task address construction examples | `agent-team-execution/task-delegation/task-delegation-address-builder.ts` | Reuse semantics; create token-specific builder if needed | Task delegation already knows how to compose task execution addresses; token usage needs a persisted snapshot, not a task-record lookup. | A Token Usage builder/scope may be needed because the current builder is tied to delegation messages and does not directly expose current-run attribution for every agent run. |
| Token event persistence | `token-usage/repositories/sql` | Extend | Existing repository owns ledger mapping. | N/A |
| Cost aggregate calculation | `token-usage/projections/token-usage-cost-summary-aggregate.ts` | Reuse | Aggregate math should not change. | N/A |
| Task statistics use-case | `token-usage/providers/statistics-provider.ts` | Extend with internal tree builder | Existing provider is the correct public boundary. | N/A |
| Frontend statistics store/table | `autobyteus-web/stores/tokenUsageStatistics.ts` and table component | Extend | Existing settings surface already owns Token Statistics display. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Agent team execution runtime context | Root execution scope propagation and current-run address construction. | DS-001 | Runtime launch/context owners, Token Usage enrichment | Extend | Keep address generation close to runtime identity, not in statistics queries. |
| Token Usage domain | Execution address type/normalizer, payload shape, statistics row shape. | DS-001, DS-002 | Token Usage | Extend | The persisted snapshot is Token Usage-owned even if segment semantics match conversation addresses. |
| Token Usage persistence | `execution_address_json` mapping and migration. | DS-001 | Token Usage ledger | Extend | JSON text follows current ledger pattern. |
| Token Usage statistics projection | Recursive task tree and aggregate roll-up. | DS-002, DS-004, DS-005 | Statistics provider | Extend/Create internal files | Tree builder should be internal to token usage, not GraphQL/frontend. |
| API GraphQL | Recursive row schema and mapping. | DS-003 | Token Usage API | Extend | Transport only. |
| Frontend settings Token Statistics | Recursive display, sorting, expansion, detail rows. | DS-003 | User-visible UI | Extend | No hierarchy inference. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `agent-team-execution/domain/token-usage-execution-scope.ts` or equivalent | Agent team execution runtime context | Runtime context identity | Define `TokenUsageExecutionScope` with root id, team-scope address, current-run address. | Small runtime attribution value object. | Uses address segment shape. |
| `agent-team-execution/services/token-usage-execution-address-builder.ts` | Agent team execution runtime context | Address construction | Build direct member, task-team child, task-agent, and nested execution scopes. | Keeps construction policy out of Token Usage statistics. | Uses `ConversationTargetAddress` normalizers. |
| `agent-team-execution/domain/member-team-context.ts` | Agent team execution runtime context | Member runtime context | Add execution scope field and constructor input. | Existing context carried to token usage enricher. | Scope type. |
| `agent-team-execution/services/member-team-context-builder.ts` | Agent team execution runtime context | Context builder | Accept/derive execution scope for direct members and task-team members. | Existing construction point. | Scope builder. |
| `agent-execution/domain/agent-run-token-usage.ts` | Token usage payload domain | Payload parser/contract | Add `execution_address`; remove path fields from active payload. | Existing payload parser owner. | Execution address normalizer. |
| `token-usage/domain/execution-address.ts` | Token Usage domain | Persisted address snapshot | Token-usage-owned type alias/normalizer/stable key for execution address JSON. | Avoid duplicating parsing in repository/provider/API. | Reuses segment semantics; strips redundant `parentTeamRunId`. |
| `token-usage/domain/statistics-models.ts` | Token Usage domain | Statistics row contracts | Recursive row kinds and row shape. | Existing model owner. | Aggregate model. |
| `token-usage/repositories/sql/token-usage-ledger-repository.ts` | Token Usage persistence | Ledger SQL mapper | Map `executionAddressJson`. | Existing repository. | Address serializer/parser. |
| `token-usage/providers/statistics-provider.ts` | Token Usage provider | Public statistics use-case | Delegate tree build and return rows. | Existing provider boundary. | Tree builder. |
| `token-usage/providers/task-statistics-tree-builder.ts` | Token Usage provider/projection | Internal tree builder | Parse address, build nodes, aggregate, sort, fallback. | Isolates recursive tree policy. | Address normalizer and aggregate builder. |
| `api/graphql/types/token-usage-stats.ts` | API GraphQL | Transport | Recursive GraphQL row type and mapper. | Existing API owner. | Statistics model. |
| `autobyteus-web/types/tokenUsageStatistics.ts` | Frontend types | Client model | Recursive row type and new row kinds. | Existing client type owner. | N/A |
| `autobyteus-web/stores/tokenUsageStatistics.ts` | Frontend store | Query normalization | Recursive normalization. | Existing store owner. | N/A |
| `autobyteus-web/graphql/queries/token_usage_statistics_queries.ts` | Frontend GraphQL | Query | Request recursive `children`. | Existing query owner. | Fragment structure. |
| `autobyteus-web/components/settings/token-usage/TokenUsageTaskStatisticsTable.vue` | Frontend settings UI | Display | Recursive table rows and expansion. | Existing UI owner. | Formatter. |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Execution address parsing/serialization/stable key | `token-usage/domain/execution-address.ts` | Token Usage | Needed by payload parser, repository, provider, and GraphQL mapper. | Yes: no `teamRunPath`/`memberPath` parallel fields. | Yes: one address object. | A generic task-record/conversation kitchen-sink model. |
| Runtime execution scope construction | `agent-team-execution/services/token-usage-execution-address-builder.ts` | Agent team execution | Needed by direct team, task-team, and task-agent run setup. | Yes: root id separate from address. | Yes: no path arrays. | A statistics query helper. |
| Recursive row model | `token-usage/domain/statistics-models.ts` | Token Usage | Used by provider and GraphQL. | Yes: replaces separate member row shape. | Yes: `children` only. | A UI-only table model. |
| Recursive frontend normalizer | `autobyteus-web/stores/tokenUsageStatistics.ts` local helper or small util | Frontend settings | Store and tests need recursive defaulting. | Yes. | Yes. | Hierarchy builder. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `TokenUsageExecutionAddress` | Yes | Yes | Low | Define it as `{ segments: [...] }` only; keep root in `root_team_run_id`, not inside the JSON. |
| `TokenUsageExecutionScope` | Yes | Yes | Low | Separate `rootTeamRunId`, `teamScopeAddress`, and `currentRunAddress`; do not store old paths. |
| `TokenUsageTaskStatisticsRow` | Yes | Yes | Low | One recursive row type with `children`; no separate member row type. |
| Ledger row identity | Yes after change | Yes for path fields | Medium | Remove/decommission old path columns and avoid using scalar fields as hierarchy authority. |
| GraphQL API | Yes after change | Yes | Medium | Remove `members`; expose `children` only. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/token-usage/domain/execution-address.ts` | Token Usage domain | Execution address snapshot | Token Usage address type, canonicalizer, parser from unknown JSON, stable key, helpers to inspect terminal node. | Central reusable domain structure. | Existing `ConversationTargetAddress` segment semantics. |
| `autobyteus-server-ts/src/agent-team-execution/services/token-usage-execution-address-builder.ts` | Agent team execution runtime | Runtime address construction | Build/extend execution scopes during direct team, task-team, task-agent, nested run setup. | Construction belongs where runtime identities are known. | Token address type and conversation segment helpers. |
| `autobyteus-server-ts/src/agent-team-execution/domain/member-team-context.ts` | Agent team execution runtime | Runtime context | Carry `tokenUsageExecutionScope` or equivalent for every team-context agent run. | Existing context passed into AgentRun config. | Scope type. |
| `autobyteus-server-ts/src/agent-team-execution/services/member-team-context-builder.ts` | Agent team execution runtime | Context builder | Populate the scope for direct members and child task-team members. | Existing central builder. | Scope builder. |
| `autobyteus-server-ts/src/agent-execution/events/processors/token-usage/token-usage-context-enricher.ts` | Agent execution token event processing | Event enrichment | Copy `root_team_run_id` and `execution_address` from runtime scope; set task display/reference metadata. | Existing enrichment point. | Token address type. |
| `autobyteus-server-ts/src/agent-execution/domain/agent-run-token-usage.ts` | Token usage payload domain | Payload contract/parser | Add `execution_address`; remove/decommission path fields. | Existing parser owner. | Token address parser. |
| `autobyteus-server-ts/prisma/schema.prisma` + migration | Token Usage persistence | SQL schema | Add `executionAddressJson`; remove/decommission `teamRunPathJson`/`memberPathJson`. | Existing schema owner. | N/A |
| `autobyteus-server-ts/src/token-usage/repositories/sql/token-usage-ledger-repository.ts` | Token Usage persistence | Repository mapper | Serialize/parse `execution_address_json`; stop path mapping. | Existing mapper. | Token address parser. |
| `autobyteus-server-ts/src/token-usage/providers/task-statistics-tree-builder.ts` | Token Usage statistics | Internal projection owner | Build recursive rows from address-bearing events and fallback legacy events. | Keeps provider readable and policy isolated. | Aggregates and address helpers. |
| `autobyteus-server-ts/src/token-usage/providers/statistics-provider.ts` | Token Usage statistics | Public provider | Fetch events, call tree builder, preserve runtime/model stats behavior. | Existing API boundary. | Tree builder. |
| `autobyteus-server-ts/src/api/graphql/types/token-usage-stats.ts` | API | Transport mapper | Recursive row GraphQL type, row-kind fields, `executionAddress` exposure, `children` mapping. | Existing GraphQL owner. | Statistics model. |
| `autobyteus-web/types/tokenUsageStatistics.ts` | Frontend settings | Client type | Recursive row interface and row kinds. | Existing type owner. | N/A |
| `autobyteus-web/stores/tokenUsageStatistics.ts` | Frontend settings | Store/normalizer | Recursive normalization and row defaults. | Existing store owner. | Client type. |
| `autobyteus-web/graphql/queries/token_usage_statistics_queries.ts` | Frontend settings | Query | Request `children` recursively; remove `members`. | Existing query owner. | GraphQL fragments. |
| `autobyteus-web/components/settings/token-usage/TokenUsageTaskStatisticsTable.vue` | Frontend settings | UI display | Render recursive rows with indentation, expansion, and cost details. | Existing component owner. | Formatter. |

## Ownership Boundaries

- Runtime/team execution owns knowledge of where a run sits in the active execution graph at creation time. It must provide Token Usage with a root id and execution address snapshot.
- Token Usage owns persisted usage events, cost aggregates, and statistics projection. It must not call Task Delegation records, memory layout, or live runtime managers to reconstruct hierarchy at query time.
- GraphQL owns transport shape only. It maps backend rows and must not compute parentage.
- Frontend owns display state only. It renders recursive rows and must not infer relationships from names, IDs, task records, or timestamps.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `TokenUsageStatisticsProvider.getTaskStatisticsInPeriod` | Ledger store, address parser, tree builder, aggregate calculation | GraphQL resolver | GraphQL resolver reading ledger rows and task records directly. | Add provider result fields/tree metadata. |
| `MemberTeamContextBuilder` / runtime context setup | Scope construction, task-team/task-agent identity propagation | Agent run creation paths | TokenUsageContextEnricher reconstructing ancestry from task records or memory paths. | Add `TokenUsageExecutionScope` to context. |
| `TokenUsageLedgerRepository` | Prisma row mapping and JSON serialization | Ledger store/provider | Provider parsing Prisma raw columns directly. | Add domain field mapping. |
| Backend recursive row API | Tree parentage and row identity | Frontend store/table | Frontend matching by display names, task ids, or task records. | Add needed display fields to row. |

## Dependency Rules

Allowed:

- Agent/team runtime context setup may depend on `ConversationTargetAddress` segment utilities and Token Usage execution-scope type if kept dependency-light.
- Token Usage domain may define its own execution address snapshot type using the same segment semantics as `ConversationTargetAddress`.
- `TokenUsageContextEnricher` may read `memberContext.tokenUsageExecutionScope` and copy it to payload.
- `TokenUsageStatisticsProvider` may depend on Token Usage repository/store, address parser, tree builder, and aggregate projection helpers.
- GraphQL may depend on Token Usage statistics result types.
- Frontend may depend on GraphQL rows and local formatting/expansion logic.

Forbidden:

- Token Usage statistics must not query `TaskDelegationRecordsService`, task record JSON files, memory directory paths, or live runtime registries to build parentage.
- Frontend must not reconstruct hierarchy from flat rows, task records, route keys, run ids, memory paths, or timestamps.
- Task statistics must not use `team_run_path_json` or `member_path_json` as active hierarchy authority.
- Do not keep GraphQL `members` as a compatibility child path beside `children`.
- Do not add new scalar task-team path/run columns as another hierarchy authority; task-team run id belongs in the `task_team` segment of the execution address.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `TokenUsageContextEnricher.enrich` | Token usage event identity | Copy runtime token attribution into payload. | `MemberTeamContext.tokenUsageExecutionScope` containing `rootTeamRunId` and `currentRunAddress`. | Does not query task records. |
| `TokenUsageLedgerRepository.toCreateInput/toDomainPayload` | Ledger event persistence | Serialize/parse execution address. | `execution_address` object <-> `execution_address_json` text. | Canonical persisted JSON. |
| `TokenUsageStatisticsProvider.getTaskStatisticsInPeriod(start, end)` | Task statistics | Return recursive task rows. | Date range only; events carry own hierarchy. | No task-record dependency. |
| `TokenUsageTaskStatisticsTreeBuilder.build(events)` | Internal task row projection | Build recursive rows. | `TokenUsageUpdatedPayload[]` with optional execution addresses. | Internal to provider. |
| GraphQL `tokenUsageTaskStatisticsInPeriod` | API result | Transport recursive rows. | `startTime`, `endTime`; returns rows with `children`. | Remove `members`. |
| Frontend `GET_TOKEN_USAGE_TASK_STATISTICS` | Client query | Fetch recursive rows. | GraphQL recursive selection. | Query depth must cover expected UI nesting. |

Rule compliance: identities are explicit. Standalone agent uses `run_id`; team hierarchy uses `root_team_run_id + execution_address_json`; row ids are derived from canonical address prefixes, never display names.

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `TokenUsageContextEnricher.enrich` | Yes | Yes after scope addition | Low | Add execution scope field to context. |
| `TokenUsageLedgerRepository` | Yes | Yes | Low | Persist one address JSON field. |
| `TokenUsageStatisticsProvider.getTaskStatisticsInPeriod` | Yes | Yes | Low | Keep tree builder internal. |
| GraphQL Task statistics row | Yes after `children` replacement | Yes | Low | Include `executionAddress` and row kind. |
| Frontend table props | Yes | Yes | Low | Accept recursive rows only. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Canonical ledger field | `execution_address_json` | Yes | Low | Use DB snake case; TS payload `execution_address`; GraphQL/client `executionAddress`. |
| Runtime attribution | `TokenUsageExecutionScope` | Yes | Low | Avoid vague names like `targetPath` or `agentReferenceAddress`. |
| Persisted address type | `TokenUsageExecutionAddress` | Yes | Low | Define one shape with `segments`. |
| Recursive children | `children` | Yes | Low | Replace `members`. |
| Task-team row kind | `TASK_TEAM_RUN` | Yes | Low | Use for displayed delegated task-team execution rows. |
| Task-agent row kind | `TASK_AGENT_RUN` | Yes | Low | Use for delegated task-agent execution rows. |
| Member row kind | `MEMBER_RUN` | Yes | Low | Use for direct member/token-producing member rows. |

## Applied Patterns (If Any)

- Value object / normalizer: `TokenUsageExecutionAddress` centralizes parse/clone/stable-key behavior.
- Builder: `TokenUsageExecutionAddressBuilder` or equivalent constructs runtime scopes at launch/context-build time.
- Repository: existing SQL repository persists token usage rows; it stays persistence-only.
- Tree/trie projection: internal tree builder maps address node identities to recursive rows and aggregate roll-ups.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/token-usage/domain/execution-address.ts` | File | Token Usage domain | Address snapshot type/normalization/stable keys. | Token Usage owns persisted address contract. | Task-record scanning, UI labels. |
| `autobyteus-server-ts/src/agent-team-execution/services/token-usage-execution-address-builder.ts` | File | Agent team runtime context | Construct execution scopes from runtime/task-team/task-agent identities. | Runtime identity is known here. | Cost/statistics aggregation. |
| `autobyteus-server-ts/src/agent-team-execution/domain/member-team-context.ts` | File | Agent team runtime context | Carry execution scope. | Existing run context boundary. | Address inference from ledger rows. |
| `autobyteus-server-ts/src/agent-team-execution/services/member-team-context-builder.ts` | File | Agent team runtime context | Build context with execution scope. | Existing builder. | Token cost math. |
| `autobyteus-server-ts/src/agent-execution/domain/agent-run-token-usage.ts` | File | Token usage payload domain | Payload parser and interfaces. | Existing payload owner. | Statistics tree construction. |
| `autobyteus-server-ts/src/token-usage/providers/task-statistics-tree-builder.ts` | File | Token Usage statistics | Recursive tree build from events. | Keeps provider concise. | GraphQL decorators, Vue formatting. |
| `autobyteus-server-ts/src/token-usage/providers/statistics-provider.ts` | File | Token Usage statistics provider | Use-case orchestration. | Existing boundary. | Raw task-record reading. |
| `autobyteus-server-ts/src/token-usage/repositories/sql/token-usage-ledger-repository.ts` | File | Token Usage persistence | SQL mapping. | Existing repository. | Hierarchy tree policy. |
| `autobyteus-server-ts/prisma/schema.prisma` + migration folder | File/Folder | Persistence schema | Add/drop columns. | Existing DB schema. | Runtime code. |
| `autobyteus-server-ts/src/api/graphql/types/token-usage-stats.ts` | File | GraphQL API | Recursive type/mapping. | Existing API owner. | Parentage inference. |
| `autobyteus-web/types/tokenUsageStatistics.ts` | File | Frontend types | Recursive client row model. | Existing type owner. | Server-only parse logic. |
| `autobyteus-web/stores/tokenUsageStatistics.ts` | File | Frontend store | Recursive normalize. | Existing store. | Parent-child construction. |
| `autobyteus-web/graphql/queries/token_usage_statistics_queries.ts` | File | Frontend query | Recursive `children` selection. | Existing query owner. | Task-record queries. |
| `autobyteus-web/components/settings/token-usage/TokenUsageTaskStatisticsTable.vue` | File | Frontend UI | Recursive rendering. | Existing table. | Hierarchy inference. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `token-usage/domain` | Domain contract | Yes | Low | Address and row types belong with Token Usage. |
| `token-usage/providers` | Main-line domain-control/projection | Yes | Low | Provider and tree builder own statistics projection. |
| `token-usage/repositories/sql` | Persistence-provider | Yes | Low | SQL mapping only. |
| `agent-team-execution/services` | Runtime context/service | Yes | Medium | Add only runtime scope construction; do not place statistics logic here. |
| `api/graphql/types` | Transport | Yes | Low | GraphQL mapping only. |
| `autobyteus-web/components/settings/token-usage` | UI display | Yes | Low | Recursive rendering belongs in the settings table. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Direct member event | `root=nested_root`, `executionAddress=[member(Teacher)]` -> root row child `MEMBER_RUN Teacher`. | `member_path_json=["Teacher"]` used as the only hierarchy field. | Direct member is simple but should use the same address model. |
| Task-team child event | `root=nested_root`, `executionAddress=[member(StudentStudyGroup), task_team(tt1), member(student_one)]` -> root child `TASK_TEAM_RUN StudentStudyGroup / tt1`, then `MEMBER_RUN student_one`. | Child rows grouped under top-level `root_team_run_id=tt1` as `Unknown team run`. | Fixes the screenshot failure. |
| Task-agent event | `root=software_root`, `executionAddress=[member(Codex), task_agent(ta1)]` -> root child `TASK_AGENT_RUN Codex / ta1`. | Standalone top-level `AGENT_RUN Codex` because `run_id` matched task agent. | Delegated task agents stay inside owning team. |
| Nested task-agent inside task-team | `[member(StudentStudyGroup), task_team(tt1), member(student_one), task_agent(ta2)]` -> `TASK_TEAM_RUN tt1` child `TASK_AGENT_RUN student_one / ta2`. | Attach by task id or timestamp to nearest visible row. | Ordered prefixes determine parentage. |
| Backend/API/UI split | Backend returns `children`; frontend recursively renders. | Frontend queries task records and joins by run id/display name. | Keeps Token Statistics self-contained and performant. |

Execution-node scanning rule:

```text
segments:
  member(A)                         -> MEMBER_RUN(A)
  member(A), task_agent(TA)          -> TASK_AGENT_RUN(A, TA)
  member(A), task_team(TT)           -> TASK_TEAM_RUN(A, TT)
  member(A), task_team(TT), member(B) -> TASK_TEAM_RUN(A, TT) -> MEMBER_RUN(B)
```

The displayed tree need not emit a separate structural `MEMBER_RUN(A)` wrapper before a task execution node unless there are direct token events for `member(A)` itself. The task execution row's `executionAddress` still includes the preceding member segment, so identity remains complete.

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep `members` and add `children` beside it | Would reduce immediate frontend churn. | Rejected | Replace active contract with `children`; update server/client together. |
| Continue reading `team_run_path_json`/`member_path_json` as hierarchy fallback for new rows | Would avoid migration pressure. | Rejected | New rows use `execution_address_json`; old no-address rows use explicit legacy fallback only. |
| Query task records during statistics projection | Latest task records contain task-run addresses. | Rejected | Persist address snapshot into each token usage event row. |
| Add one extra file or per-row file for hierarchy | User explicitly rejected extra files as over-engineered. | Rejected | Store JSON text in `token_usage_ledger_events.execution_address_json`. |
| Frontend reconstructs hierarchy from flat rows | Might be faster to prototype. | Rejected | Backend builds tree and API returns recursive rows. |
| Add separate task-team path/run columns as hierarchy identity | Could simplify filtering. | Rejected | `task_team` segment in execution address carries task-team run id. |

## Derived Layering (If Useful)

- Runtime identity layer: builds `TokenUsageExecutionScope` while all parent/team/task context is still known.
- Token Usage domain/persistence layer: defines and stores the canonical execution address snapshot.
- Token Usage projection layer: builds recursive rows and aggregates from ledger events only.
- API transport layer: exposes recursive rows.
- UI layer: renders recursive rows and display state.

The important rule is ownership, not vertical layering: higher layers must not bypass Token Usage statistics and reach into task records or memory paths.

## Migration / Refactor Sequence

1. Add `TokenUsageExecutionAddress` domain type/normalizer/stable-key helpers under Token Usage. Use the existing `ConversationTargetAddress` segment semantics but keep root id out of the JSON to avoid duplication.
2. Add runtime `TokenUsageExecutionScope` and builder support. Direct root members receive `rootTeamRunId=<teamRunId>`, `teamScopeAddress=[]`, and `currentRunAddress=[member(current)]`.
3. Update task-team launch/context creation so child team members inherit the original `rootTeamRunId` and receive `teamScopeAddress=parentScope.teamScopeAddress + [member(logicalTeam), task_team(taskTeamRunId)]`; each child member's current address appends `member(child)`.
4. Update task-agent launch/context creation so task-agent runs receive `currentRunAddress=parentScope.teamScopeAddress + [member(logicalMember), task_agent(taskAgentRunId)]`.
5. Update `TokenUsageContextEnricher` to set `root_team_run_id` and `execution_address` from the scope. It should not use immediate child `teamRunId` as root when a root scope exists. It should set `task_id` from task-agent or task-team instance metadata where available as non-hierarchy display/reference metadata.
6. Update token usage payload interfaces/parsers to include `execution_address`; remove/decommission `team_run_path` and `member_path` from active hierarchy payloads.
7. Add Prisma migration and repository mapping for `execution_address_json`. Remove/decommission `team_run_path_json` and `member_path_json` from active model.
8. Replace statistics row domain model with recursive `children` and row kinds `TEAM_RUN`, `AGENT_RUN`, `MEMBER_RUN`, `TASK_TEAM_RUN`, `TASK_AGENT_RUN`.
9. Implement `TaskStatisticsTreeBuilder` and update `TokenUsageStatisticsProvider.getTaskStatisticsInPeriod` to use it. Preserve runtime/model statistics code and cost aggregate helpers.
10. Update GraphQL types/mappers/query response from `members` to recursive `children`; expose `executionAddress` when useful for debugging/display, but do not require frontend to parse it for hierarchy.
11. Update frontend types, GraphQL query, store normalizer, row-kind labels, recursive table rendering, and tests. Remove `members` use.
12. Add/adjust durable coverage: unit tests for direct member, task-team child members, task-agent, nested task execution, multiple executions same target, invalid/no-address fallback, API schema, and frontend recursive rendering.
13. Remove stale code paths/imports/tests tied only to `team_run_path_json`, `member_path_json`, `TokenUsageTaskMemberStatisticsRow`, and frontend `members` rendering.

## Key Tradeoffs

- Storing `execution_address_json` denormalizes hierarchy into every token usage row, but it makes Token Statistics self-contained and avoids slower, brittle task-record joins at query time.
- The address JSON reuses existing segment semantics instead of inventing a new `target_path`; this keeps Team Communication, Task Delegation, and Token Usage conceptually aligned.
- Root id remains separate from address JSON to avoid duplication and preserve efficient grouping/indexing.
- Legacy no-address rows cannot be perfectly nested; safe fallback is more honest than heuristic parentage.
- GraphQL recursive selection requires finite client query depth. Use a practical depth that covers supported UI nesting; the backend row model itself remains recursive.

## Risks

- Missing propagation point: if any task-team/task-agent launch path creates member contexts without the execution scope, new rows may still lack correct addresses. Implementation must audit all member context creation paths.
- Address/display mismatch: display names may be missing for task-team/task-agent rows. Backend should provide explicit fallback labels using row kind and short execution id.
- GraphQL query depth: deeply nested task delegation beyond the requested fragment depth would not render completely. Choose/document a reasonable UI max depth or add an API pattern that avoids cyclic fragments.
- Migration complexity: dropping old columns may require care across SQLite/Prisma environments. If physical drop is unsafe in one release, active code must still stop reading/writing them and the follow-up physical drop must be recorded.
- Live Token Meter surfaces currently use scalar member fields for filtering. Do not accidentally break those while removing path hierarchy fields; scalar member filters are not Task statistics hierarchy authority.

## Guidance For Implementation

- Treat `execution_address_json` as the only hierarchy authority for new team-context Token Usage rows.
- Keep parsing strict enough to reject malformed addresses into legacy/invalid fallback, but do not crash an entire statistics query because one old row is malformed.
- Generate row ids from `root_team_run_id` plus a canonical serialized address/node prefix (prefer a stable hash or escaped key), not display labels.
- Parent aggregates include all descendant events exactly once. Leaf/direct aggregates include only events for that exact execution node.
- Multiple task-team or task-agent executions with different run ids must be separate rows even if they target the same logical member/team.
- The frontend may indent/render rows based on `children`, `rowKind`, and backend-provided display fields. It must not query task records or infer hierarchy.
- Add fixtures that match the reported failure: root classroom team, `Teacher`, delegated `StudentStudyGroup` task-team, child `student_one`/`student_two`, and a delegated task agent such as `Codex`.
