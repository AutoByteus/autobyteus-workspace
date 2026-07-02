# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready — revised after product/design discussion on 2026-07-02. The agreed direction is: Token Usage must be self-contained, store one canonical execution address in the token usage event table, remove/decommission fragmented path fields as hierarchy authority, and build the recursive Task statistics structure on the backend.

## Goal / Problem Statement

Token Statistics in `Task` grouping must present team, member, delegated task-agent, and delegated task-team usage as a clear backend-built hierarchy under the original root team run.

The current token usage ledger has fragmented hierarchy fields:

- `root_team_run_id`
- `team_run_path_json`
- `member_path_json`
- `member_route_key`
- task-agent fields such as `task_agent_run_id` / `task_id`

In practice, `team_run_path_json` is not populated in observed data, `member_path_json` only represents local member paths, and delegated task-team usage can be stored with the child task-team run as `root_team_run_id`. This produces unrelated top-level rows such as `Unknown team run` instead of nesting the delegated work under the root team.

The desired model is a self-contained token usage ledger row with one canonical hierarchy identity:

```text
root_team_run_id
execution_address_json
```

The backend Token Statistics API should use that canonical address to build recursive task rows. The frontend should only render the backend row tree and must not reconstruct hierarchy.

## Investigation Findings

- Latest branch base is `origin/personal` at `f4e39308347c41f824c12d548ce0c07f06c6e4f9` after refresh on 2026-07-02.
- The database still has `team_run_path_json` and `member_path_json` on `token_usage_ledger_events`; latest `origin/personal` did not change this hierarchy model.
- Local DB probe showed `member_path_json` populated for direct/local members, e.g. `[
  "Teacher"
]` or `[
  "student_one"
]`, but `team_run_path_json` had zero non-null groups in the inspected local DB.
- For delegated task-team rows, current data looks like:

```json
{
  "root_team_run_id": "studentstudygroup_e049380d1c27474788c797fc813205d3",
  "team_run_path_json": null,
  "member_path_json": ["student_one"],
  "member_route_key": "student_one"
}
```

That is insufficient to reconstruct:

```text
Nested Classroom Test Team
  StudentStudyGroup task team
    student_one
```

- Team Communication and Task Delegation already use `ConversationTargetAddress` with ordered typed segments such as `member`, `task_team`, and `task_agent`; latest task records persist task-run and communication addresses, but Token Statistics must not query task records to reconstruct hierarchy.
- The agreed Token Usage hierarchy model should align with that address concept but store the address in the token usage event table, not in a separate file and not as a frontend reconstruction.
- Backend Task statistics currently returns top-level rows plus `members`; this API shape is too narrow for `Task Team` and `Task Agent` rows.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change / Feature with data-model cleanup and API/UI refactor.
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Shared Structure Looseness and Boundary Or Ownership Issue.
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Refactor needed now.
- Evidence basis: Token usage has several partial hierarchy fields but no one canonical hierarchy identity. Existing fields are either not populated (`team_run_path_json`) or only local (`member_path_json`). The API child model is member-only, forcing delegated task executions into incorrect top-level rows.
- Requirement or scope impact: This task must cleanly replace the fragmented path hierarchy model with a canonical execution address, update ingestion/persistence, and return backend-built recursive Task statistics rows.

## Recommendations

- Add `execution_address_json` to `token_usage_ledger_events` as the canonical token usage hierarchy address.
- Use a TypeScript field name `execution_address` and GraphQL/client field `executionAddress` where exposed.
- Use the existing `ConversationTargetAddress` segment concept as the model basis, with segments such as:
  - `{ kind: "member", memberRouteKey }`
  - `{ kind: "task_team", taskTeamRunId }`
  - `{ kind: "task_agent", taskAgentRunId }`
- Keep `root_team_run_id` as the root grouping/index key.
- Remove/decommission `team_run_path_json` and `member_path_json` as hierarchy authority. If implementation keeps them temporarily during schema migration, they must be derived/non-authoritative and not used by Task statistics grouping.
- Backend `TokenUsageStatisticsProvider` must build recursive task rows. Frontend must not construct the hierarchy from flat rows.
- Replace the `members` API shape with recursive `children` rows.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium-to-Large

Rationale: This crosses token usage event enrichment, Prisma/SQL persistence, statistics projection, GraphQL schema, frontend table rendering, and tests. It does not require changing token accounting math or task-delegation lifecycle.

## In-Scope Use Cases

- View Task-grouped Token Statistics for a root team with direct member usage.
- View Task-grouped Token Statistics for a root team whose member delegates to a task-team execution.
- View Task-grouped Token Statistics for a root team whose member delegates to a task-agent execution.
- View nested usage inside a delegated task-team, e.g. `StudentStudyGroup -> task_team -> student_one`.
- Distinguish multiple delegated task-team/task-agent executions for the same logical target as separate rows.
- Preserve standalone agent runs as top-level `AGENT_RUN` rows.
- Preserve legacy rows without execution addresses as explicit fallback rows.

## Out of Scope

- Changing token accounting, pricing, cache semantics, or runtime/model grouping math.
- Changing Task Delegation lifecycle, review, settlement, or task records behavior.
- Building the hierarchy on the frontend from flat rows.
- Adding a separate token hierarchy file or per-row file.
- Guessing parentage for legacy rows by timestamp, display name, or memory directory.
- Keeping the old `members` API as a compatibility path.

## Functional Requirements

- `FR-001` Canonical execution address: Each new team-context token usage event must persist a canonical `execution_address_json` in `token_usage_ledger_events` that identifies the token-producing execution's location relative to the root team.
- `FR-002` Root grouping key: Each team-context token usage event must persist the actual root team run id in `root_team_run_id`; delegated task-team child usage must not use the child task-team run id as the root.
- `FR-003` Address segment model: `execution_address_json` must use ordered typed address segments compatible with the existing conversation/task address concept, including at minimum `member`, `task_team`, and `task_agent` segment kinds.
- `FR-004` Direct member address: Direct root team member usage must store an execution address like `[{ kind: "member", memberRouteKey: "Teacher" }]`.
- `FR-005` Task-team child member address: Usage by a member inside a delegated task team must store an execution address like `member(StudentStudyGroup) -> task_team(taskTeamRunId) -> member(student_one)`.
- `FR-006` Task-agent address: Usage by a delegated task agent must store an execution address like `member(Codex) -> task_agent(taskAgentRunId)` or the equivalent logical member route for the delegated target.
- `FR-007` Nested task execution address: If a delegated task agent or nested task team runs inside a task-team context, the execution address must include all ordered ancestor segments before the nested task execution segment.
- `FR-008` Self-contained statistics: `TokenUsageStatisticsProvider.getTaskStatisticsInPeriod` must build Task statistics from token usage-owned ledger data, primarily `root_team_run_id` and `execution_address_json`, without querying task records, memory directories, live runtime managers, or frontend state.
- `FR-009` Backend-built tree: The backend Task statistics API must return a recursive row tree; the frontend must not reconstruct the tree from flat token rows.
- `FR-010` Recursive row kinds: Task statistics rows must support `TEAM_RUN`, `AGENT_RUN`, `MEMBER_RUN`, `TASK_TEAM_RUN`, and `TASK_AGENT_RUN` row kinds.
- `FR-011` API cleanup: Replace the active `members` child field with recursive `children`; do not expose both as active compatibility surfaces.
- `FR-012` Old path decommission: `team_run_path_json` and `member_path_json` must be removed or decommissioned as hierarchy authority. Task grouping must not depend on them after this change.
- `FR-013` Display fields: Token usage must continue to capture display fields needed for self-contained statistics. Task rows may use execution address plus captured names/task metadata to show useful labels; fallback labels must be explicit when display metadata is missing.
- `FR-014` Aggregate correctness: Parent row aggregates must include all descendant usage exactly once; task/member rows must not also appear as unrelated top-level rows when execution addresses provide hierarchy.
- `FR-015` Multiple executions: Multiple task-team or task-agent executions for the same logical target must be separate rows keyed by execution run id and/or task id, not merged by display name.
- `FR-016` Legacy fallback: Existing rows without `execution_address_json` must remain visible using safe fallback grouping; they must not be attached to a parent by guessing.
- `FR-017` Existing statistics preservation: Total cost, runtime/model grouping, cache details, reasoning/output subtotals, date filtering, and standalone agent behavior must remain semantically unchanged.

## Acceptance Criteria

- `AC-001` Given a root team `Nested Classroom Test Team` where `Teacher` delegates to `StudentStudyGroup`, new token usage events from `student_one` inside the delegated task team persist `root_team_run_id = <Nested Classroom root>` and `execution_address_json` with segments `member(StudentStudyGroup) -> task_team(<taskTeamRunId>) -> member(student_one)`.
- `AC-002` Task-grouped statistics for that date range shows one top-level `Nested Classroom Test Team` row, a nested `Task Team` row for the delegated `StudentStudyGroup` execution, and a child `Member` row for `student_one`; it does not show the task-team run as a top-level `Unknown team run`.
- `AC-003` Given `student_one` and `student_two` both produce token usage inside the same delegated task-team execution, both member rows appear under the same `Task Team` row and their aggregate contributes exactly once to the task-team and root team totals.
- `AC-004` Given two delegated task-team executions to `StudentStudyGroup` with different task-team run ids, Task statistics shows two separate `Task Team` rows under the root team.
- `AC-005` Given a delegated task-agent execution whose token events have `member(Codex) -> task_agent(<taskAgentRunId>)`, Task statistics shows a `Task Agent` child row under the owning root/team context, not a standalone top-level agent row.
- `AC-006` Given a nested task-agent inside a task-team context, the backend API places the `Task Agent` row under the nearest owning `Task Team` row according to execution address prefixes.
- `AC-007` The GraphQL response for Task statistics exposes recursive `children` rows and no active `members` field.
- `AC-008` The frontend Token Statistics table renders the backend-provided recursive tree and does not call task-record APIs or implement hierarchy reconstruction logic.
- `AC-009` Runtime/model statistics for the same date range return the same totals before and after the hierarchy refactor.
- `AC-010` Legacy events without `execution_address_json` remain visible with explicit fallback/unknown labels and are not re-parented by heuristics.
- `AC-011` Tests cover direct members, delegated task-team child members, delegated task agents, nested task execution addresses, multiple executions for the same target, and legacy fallback rows.

## Constraints / Dependencies

- Token statistics must be self-contained in token usage-owned persistence.
- Token usage event rows are stored in the SQL/Prisma `token_usage_ledger_events` table; the canonical address belongs there as a DB column, not a separate file.
- The backend owns tree construction and aggregate correctness.
- Frontend consumes already-structured API rows for display only.
- The address model should align with existing `ConversationTargetAddress` semantics where possible, but the token usage field must be owned by Token Usage as its execution identity snapshot.
- No backward compatibility wrappers or dual active API paths for `members`/`children`.

## Assumptions

- `execution_address_json` can be stored as JSON text consistently with existing JSON columns in the Prisma model.
- `root_team_run_id` remains useful as a scalar filter/index for team-context statistics.
- Standalone agent rows do not need `execution_address_json`; `run_id` remains sufficient for standalone top-level `AGENT_RUN` rows.
- Existing task/team runtime context contains enough information at event-enrichment time to construct the execution address for new events.

## Risks / Open Questions

- Migration/removal of `team_run_path_json` and `member_path_json` must be sequenced carefully with any code still reading summaries that expose those fields.
- Existing run summary GraphQL currently exposes `teamRunPath` and `memberPath`; implementation must either remove/replace those fields or route them through a clean new `executionAddress` contract.
- Display labels for task-team/task-agent rows may require captured display metadata in addition to structural address segments.
- Historical data without execution addresses cannot be perfectly repaired without additional migration rules; safe fallback is required.

## Requirement-To-Use-Case Coverage

| Use Case | Requirements |
| --- | --- |
| Direct root team member usage | `FR-001`, `FR-002`, `FR-003`, `FR-004`, `FR-008`, `FR-009`, `FR-010`, `FR-014` |
| Delegated task-team usage | `FR-001`, `FR-002`, `FR-003`, `FR-005`, `FR-008`, `FR-009`, `FR-010`, `FR-014`, `FR-015` |
| Delegated task-agent usage | `FR-001`, `FR-002`, `FR-003`, `FR-006`, `FR-008`, `FR-009`, `FR-010`, `FR-014`, `FR-015` |
| Nested task execution | `FR-007`, `FR-014` |
| API/frontend tree rendering | `FR-009`, `FR-010`, `FR-011` |
| Old field cleanup | `FR-012` |
| Legacy rows | `FR-016` |
| Existing stats behavior | `FR-017` |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| `AC-001` | Verifies producer-side self-contained address persistence. |
| `AC-002` | Verifies the main screenshot failure is fixed for new rows. |
| `AC-003` | Verifies task-team child member expansion and aggregate correctness. |
| `AC-004` | Verifies repeated delegations do not merge by target label. |
| `AC-005` | Verifies task-agent rows are first-class child rows. |
| `AC-006` | Verifies ordered address prefixes handle nested executions. |
| `AC-007` | Verifies API cleanup from `members` to `children`. |
| `AC-008` | Verifies frontend is display-only for hierarchy. |
| `AC-009` | Verifies non-Task grouping semantics remain stable. |
| `AC-010` | Verifies safe handling of old data. |
| `AC-011` | Verifies durable coverage breadth. |

## Approval Status

Direction approved in discussion on 2026-07-02: use `execution_address_json` as the canonical Token Usage execution hierarchy address, remove/decommission fragmented path fields as hierarchy authority, and build recursive Task statistics on the backend.
