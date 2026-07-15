# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete. Dedicated ticket worktree/branch reused and refreshed to latest `origin/personal` on 2026-07-02.
- Current Status: Requirements/design revised to the agreed self-contained Token Usage model using `execution_address_json`.
- Investigation Goal: Determine how Token Statistics should persist enough hierarchy information to show direct members, task-agent executions, task-team executions, and nested task executions under the original root team without frontend reconstruction or task-record query-time joins.
- Scope Classification (`Small`/`Medium`/`Large`): Medium-to-Large.
- Scope Classification Rationale: The fix crosses runtime context enrichment, token usage payload/domain types, SQL/Prisma persistence, statistics projection, GraphQL schema, frontend store/query/table rendering, and tests. Token accounting and pricing math remain out of scope.
- Scope Summary: Replace fragmented path hierarchy fields with one canonical token-usage-owned execution address, build recursive Task statistics rows on the backend, and render those rows on the frontend.
- Primary Questions To Resolve:
  1. Are existing `team_run_path_json` / `member_path_json` sufficient? Answer: no.
  2. Should Token Statistics query Task Delegation records? Answer after product clarification: no; Token Statistics must be self-contained.
  3. Where should hierarchy be stored? Answer: in `token_usage_ledger_events.execution_address_json` alongside `root_team_run_id`.
  4. Who builds the row tree? Answer: backend Token Usage statistics provider/API.

## Request Context

The user showed Task-grouped Token Statistics where a delegated task-team run appears as a separate top-level `Unknown team run`, while the parent/root team appears separately with only direct members. The user clarified that this team is intentionally messy because it is used to test task agents and task-agent teams. Product expectation is that delegated task-team and task-agent work remains nested under the original parent team as first-class rows. The user explicitly rejected a design that would query task-record files at statistics time and clarified that Token Statistics should be self-contained in the token usage database rows.

Final agreed direction from 2026-07-02 discussion:

- Use `execution_address_json` as the canonical address field name in token usage event persistence.
- Keep `root_team_run_id` as scalar root grouping/index identity.
- Remove/decommission `team_run_path_json` and `member_path_json` as hierarchy authority.
- Backend builds recursive Task statistics from token usage-owned data; frontend display-only.
- No extra per-row files; the address lives in the existing event table as JSON text.

Reference screenshot:

- `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_3dcd44d61a9842ea8be0d3019eeefb93/solution_designer_4458febf14d34799bddefaa699cc94ab/context_files/ctx_88d1feab9e86__image.png`

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git superrepo worktree.
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-nested-task-runs`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-nested-task-runs/tickets/done/token-statistics-nested-task-runs`
- Current Branch: `codex/token-statistics-nested-task-runs`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-nested-task-runs`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin personal` completed; branch reset to latest `origin/personal` at `f4e39308347c41f824c12d548ce0c07f06c6e4f9` (`docs(ticket): record token meter release v1.3.93`).
- Task Branch: `codex/token-statistics-nested-task-runs`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None.
- Notes For Downstream Agents: Earlier artifacts/design handoffs that depended on task-record query-time attribution are superseded. Use this artifact set only.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-07-02 | Command | `git fetch origin personal && git reset --hard origin/personal` | Ensure the ticket branch is based on newest `origin/personal` after task-record refactor. | Worktree reset to `f4e39308347c41f824c12d548ce0c07f06c6e4f9`; latest base includes token meter release docs and prior task-record persistence work. | No |
| 2026-07-02 | Code | `autobyteus-server-ts/prisma/schema.prisma` | Inspect token ledger columns. | `TokenUsageLedgerEvent` still has `rootTeamRunId`, `teamRunPathJson`, `memberAgentRunId`, `memberPathJson`, `memberRouteKey`, task-agent fields, and no `executionAddressJson`. | Add new canonical column and remove/decommission old path columns. |
| 2026-07-02 | Code | `autobyteus-server-ts/src/agent-execution/domain/agent-run-token-usage.ts` | Inspect token usage payload contracts. | Payload and run summary expose `team_run_path` and `member_path`, no `execution_address`. | Replace active hierarchy payload fields with `execution_address`. |
| 2026-07-02 | Code | `autobyteus-server-ts/src/agent-execution/events/processors/token-usage/token-usage-context-enricher.ts` | Find producer-side context attribution. | Enricher sets `root_team_run_id` from `memberContext.teamRunId`, copies `team_run_path` from existing payload, and sets `member_path` from the current local member only. This is wrong for task-team child members because the child task-team run can become the root. | Add a root-scope/execution-address owner in member runtime context and copy it here. |
| 2026-07-02 | Code | `autobyteus-server-ts/src/token-usage/repositories/sql/token-usage-ledger-repository.ts` | Inspect SQL row mapping. | Repository writes `teamRunPathJson`/`memberPathJson` and reads them back into payload fields. | Map `executionAddressJson`; remove old path mapping from active model. |
| 2026-07-02 | Code | `autobyteus-server-ts/src/token-usage/domain/statistics-models.ts` | Inspect Task statistics domain model. | Task rows only support `TEAM_RUN | AGENT_RUN`; team child rows are a separate member-only shape under `members`. | Replace with one recursive row shape and row kinds for team, agent, member, task-team, task-agent. |
| 2026-07-02 | Code | `autobyteus-server-ts/src/token-usage/providers/statistics-provider.ts` | Inspect current projection logic. | Provider groups events with `root_team_run_id` into top-level teams and then groups by `member_agent_run_id ?? member_route_key ?? run_id`; no recursive address tree. | Build a token-usage-owned trie/tree from `execution_address`. |
| 2026-07-02 | Code | `autobyteus-server-ts/src/api/graphql/types/token-usage-stats.ts` | Inspect API schema. | GraphQL exposes `TokenUsageTaskMemberStatisticsRowGraphql` and `members`; run summaries expose `teamRunPath`/`memberPath`. | Expose recursive `children` and `executionAddress`; remove active `members` contract. |
| 2026-07-02 | Code | `autobyteus-web/types/tokenUsageStatistics.ts`, `autobyteus-web/stores/tokenUsageStatistics.ts`, `autobyteus-web/graphql/queries/token_usage_statistics_queries.ts`, `autobyteus-web/components/settings/token-usage/TokenUsageTaskStatisticsTable.vue` | Inspect frontend Task statistics handling. | Client types/store/table assume one-level `members` under top-level rows. | Store normalizes recursive `children`; table renders recursive rows only. |
| 2026-07-02 | Code | `autobyteus-server-ts/src/agent-team-execution/domain/conversation-target-address.ts` | Inspect existing address semantics. | `ConversationTargetAddress` already has ordered typed segments: `member`, `task_team`, and `task_agent`, with normalizers/debug helpers. | Reuse this shape as structural basis for token usage execution address snapshots. |
| 2026-07-02 | Code | `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-address-builder.ts` | Inspect task address construction. | Task Delegation can build caller, target, task-run, and task-team-ingress addresses using member/task-team/task-agent segments. | Add a token-usage execution-address builder using the same segment conventions. |
| 2026-07-02 | Code | `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-record.ts` | Verify latest task-record structure. | Task records now store `senderAddress`, `receiverAddress`, and `taskRun.address`; useful evidence that address shape is established, but user explicitly does not want Token Statistics to query task records. | Do not use task records as Token Statistics query-time dependency. |
| 2026-07-02 | Code | `autobyteus-server-ts/src/agent-team-execution/services/member-team-context-builder.ts`, `autobyteus-server-ts/src/agent-team-execution/domain/member-team-context.ts` | Inspect runtime member context. | `MemberTeamContext` stores current team/member identity plus optional `taskAgentInstance` and `taskTeamInstance`, but no canonical token usage root/execution address field. | Add a dedicated token usage execution attribution/address snapshot to runtime context. |
| 2026-07-02 | Data | Local SQLite probe of token ledger groups | Check whether old paths are populated enough for reconstruction. | `team_run_path_json` had zero non-null groups in inspected DB. Direct members had `member_path_json` like `["Teacher"]`; delegated task-team child members had local paths like `["student_one"]` and child-team root ids. | Confirms old path fields are insufficient. |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: runtime/provider token usage events enter `TokenUsageContextEnricher`, are persisted through `TokenUsageLedgerStore` / `TokenUsageLedgerRepository`, then are aggregated by `TokenUsageStatisticsProvider` and exposed by GraphQL to the settings Token Statistics table.
- Current execution flow:
  1. Runtime emits a `TokenUsageUpdatedPayload`.
  2. `TokenUsageContextEnricher` enriches run/member/team fields from `AgentRunContext.config.memberTeamContext`.
  3. SQL repository serializes `team_run_path` and `member_path` to JSON text columns.
  4. Task statistics groups events by `root_team_run_id` for top-level team rows, otherwise by standalone `run_id`.
  5. Team rows group immediate member rows by `member_agent_run_id ?? member_route_key ?? run_id`.
  6. GraphQL exposes `members`; frontend renders top-level rows plus one member level.
- Ownership or boundary observations:
  - Token Usage owns token/cost measurements and statistics projection.
  - Team/Task execution owns runtime address semantics, but Token Usage currently snapshots only fragmented local fields.
  - Frontend currently assumes the API shape is one-level and cannot represent task-team/task-agent rows.
- Current behavior summary: Delegated task-team child usage can be recorded under the child task-team run and/or only local member path, so statistics cannot nest it under the original parent team. The screenshot's separate `Unknown team run` row is expected from this model.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change / Feature with data-model cleanup and API/UI refactor.
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Shared Structure Looseness and Boundary Or Ownership Issue.
- Refactor posture evidence summary: Adding task-team handling to existing `member_path`/`team_run_path` fields would preserve parallel representations that already failed. A clean canonical address is required now.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| Prisma schema and repository | Ledger has multiple partial hierarchy columns, no canonical address. | Shared structure is loose and redundant. | Add `execution_address_json`; remove/decommission path columns. |
| Context enricher | `root_team_run_id` comes from immediate member team context. | Delegated task-team child member events can become independent roots. | Runtime context needs root-scope token attribution. |
| Statistics provider | Only `TEAM_RUN`, `AGENT_RUN`, and member child rows. | API model cannot represent task-team/task-agent hierarchy. | Recursive row model. |
| Frontend table | Renders only `row.members`. | UI cannot display backend nested structure even after backend fix. | Recursive renderer. |
| User clarification | Token Statistics must be self-contained and backend-built. | Task records are not query-time authority. | Persist canonical address in ledger rows. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-team-execution/domain/conversation-target-address.ts` | Typed conversation target addresses | Already has `member`, `task_team`, `task_agent` segments. | Structural model to reuse for execution address snapshot. |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-address-builder.ts` | Task delegation address construction | Builds task-run addresses with the desired segment order. | Token usage can add a parallel execution-address builder/adapter rather than invent new segment semantics. |
| `autobyteus-server-ts/src/agent-team-execution/domain/member-team-context.ts` | Runtime member/team context available to agent runs | Has local member/team fields and optional task instances, but no canonical root execution address. | Add token usage execution attribution/address to this context or a dedicated nested object on it. |
| `autobyteus-server-ts/src/agent-execution/domain/agent-run-token-usage.ts` | Token usage payload contract | Has `team_run_path` and `member_path`, no `execution_address`. | Replace active hierarchy contract with `execution_address`. |
| `autobyteus-server-ts/src/agent-execution/events/processors/token-usage/token-usage-context-enricher.ts` | Producer-side enrichment | Current source of wrong/incomplete hierarchy attribution. | Copy canonical execution address/root from runtime context. |
| `autobyteus-server-ts/prisma/schema.prisma` | SQL ledger schema | Has path JSON columns, no address JSON column. | Add `executionAddressJson`; remove/decommission path columns. |
| `autobyteus-server-ts/src/token-usage/repositories/sql/token-usage-ledger-repository.ts` | SQL mapping | Maps path fields. | Map `execution_address_json`; remove path mapping. |
| `autobyteus-server-ts/src/token-usage/domain/statistics-models.ts` | Statistics result model | Member-only child row type. | Replace with recursive row model. |
| `autobyteus-server-ts/src/token-usage/providers/statistics-provider.ts` | Statistics projection | Groups by root/member only. | Build tree from execution address. |
| `autobyteus-server-ts/src/api/graphql/types/token-usage-stats.ts` | GraphQL token stats | Exposes `members` and run summary path fields. | Expose `children` and execution address where needed. |
| `autobyteus-web/graphql/queries/token_usage_statistics_queries.ts` | Frontend query | Requests one-level `members`. | Query recursive `children` to a bounded depth or via fragments if supported. |
| `autobyteus-web/stores/tokenUsageStatistics.ts` | Client normalization | Normalizes one-level `members`. | Normalize recursive `children`. |
| `autobyteus-web/components/settings/token-usage/TokenUsageTaskStatisticsTable.vue` | UI table | Renders one-level member rows. | Render backend-provided recursive rows. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-07-02 | Data probe | SQLite group query for `team_run_path_json is not null` | Zero groups in local DB. | Existing team path is not useful today. |
| 2026-07-02 | Data probe | SQLite query of recent team/task-team token rows | Direct members have `member_path_json` like `["Teacher"]`; task-team child members have `["student_one"]` with child root id. | Current fields cannot reconstruct root parent/task-team relationship. |
| 2026-07-02 | Code probe | `rg "team_run_path_json|member_path_json|team_run_path|member_path" ...` | Path fields are used in payload, repository, GraphQL summaries, client types, and current member rows. | Cleanup must update server and client active surfaces. |

## External / Public Source Findings

No external/public sources consulted.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: No service startup was required for design. Local SQLite DB and memory files were inspected read-only.
- Required config, feature flags, env vars, or accounts: None for investigation.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: `git fetch origin personal`; `git reset --hard origin/personal`.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

1. `team_run_path_json` and `member_path_json` are not a complete hierarchy model and should not become the future standard.
2. `team_run_path_json` was not populated in observed local data.
3. `member_path_json` is local to the current team context and does not include task-team/task-agent ancestry.
4. Delegated task execution needs ordered typed segments (`member`, `task_team`, `task_agent`) to reconstruct hierarchy without guessing.
5. `ConversationTargetAddress` and task records prove the segment shape already exists, but Token Statistics must snapshot the execution address into token usage rows rather than query task records later.
6. The current Task statistics API shape (`members`) encodes old one-level semantics and must be replaced with recursive `children`.
7. Backend tree construction is required for correctness/performance and to keep frontend display-only.

## Constraints / Dependencies / Compatibility Facts

- No backward-compatible dual active API surfaces for `members` and `children`.
- Existing path fields should be removed or explicitly decommissioned as non-authoritative.
- Migration must handle legacy rows without execution addresses as safe fallback rows.
- Runtime/model statistics and token/cost math must remain unchanged.
- The canonical address should be stored in SQL event rows, not in extra files.
- Do not query task-record files/services from `TokenUsageStatisticsProvider.getTaskStatisticsInPeriod` for hierarchy construction.

## Open Unknowns / Risks

- Need decide whether run-summary APIs should remove `teamRunPath`/`memberPath` immediately or replace them with `executionAddress`; active Task grouping must not depend on old path fields either way.
- Need ensure task-team run-level/root context is available for all child members, not only task-team ingress, so execution addresses are complete.
- Need define display metadata for task-team/task-agent rows without reintroducing redundant hierarchy fields.
- Legacy rows without `execution_address_json` cannot be perfectly nested without guessing; fallback grouping is acceptable.

## Notes For Architect Reviewer

The final direction differs from the superseded task-record-join design. Task records are not query-time authority for Token Statistics. Token usage ledger rows must carry a canonical `execution_address_json`; the backend Token Usage statistics projection builds recursive `children` from token usage-owned data only.
