# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete — refreshed `origin/personal`, reused the dedicated matching task worktree, and kept all authoritative artifacts outside the user's dirty shared checkout.
- Current Status: Complete for revised solution design — the supported production path, exact failing field, shared-source reachability, persisted-data outcome, scalar/codegen constraints, UI exact-display gap, and validation shape are resolved.
- Investigation Goal: Determine whether the Token Statistics failure is local data corruption, a database/schema problem, or a shared source defect; trace the real UI-to-storage-to-GraphQL path; and define a proportional correction.
- Scope Classification (`Small`/`Medium`/`Large`): `Medium`
- Scope Classification Rationale: The defect is one transport scalar mismatch, but the coherent correction spans backend schema declarations, frontend codegen configuration/generated types, and real GraphQL plus UI/store coverage.
- Scope Summary: Preserve the existing Token Statistics feature while replacing the signed-32-bit GraphQL boundary for token-valued fields with an exact safe-integer boundary. No database change.
- Primary Questions To Resolve:
  1. Which supported request and GraphQL response field fails?
  2. Does the local ledger contain corrupt/incompatible data, or does normal aggregation legitimately exceed GraphQL `Int`?
  3. Which owner and existing scalar should represent the domain without changing client runtime types?
  4. Which generated/client and executable paths must remain aligned?

## Request Context

The user supplied a Settings → Token Statistics screenshot for Task grouping over 2026-07-21 to 2026-07-28. Fetching statistics displays `Int cannot represent non 32-bit signed integer value: 3136827911`. The user asked whether this is local database damage or a product bug and, after the diagnosis was explained, explicitly approved implementation on 2026-07-28.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): `Git`
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-int-overflow`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/token-statistics-int-overflow`
- Current Branch: `codex/token-statistics-int-overflow`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-int-overflow`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch --prune origin` succeeded on 2026-07-28; `origin/personal` resolved to `a3beeec29a701e6731d985f76d083a12bd82478f`.
- Task Branch: `codex/token-statistics-int-overflow`, initially at the same refreshed commit.
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): latest tracked `origin/personal`, integrated into `personal` by downstream delivery procedure.
- Bootstrap Blockers: None.
- Notes For Downstream Agents: The original checkout `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` is on `personal` and contains unrelated dirty files; do not use it for task edits. At solution-finalization time this dedicated worktree also contained uncommitted candidate implementation/test changes in four tracked files (`token-usage-stats.ts`, one token-usage E2E test, `codegen.ts`, and generated GraphQL output). Those source changes were not authored by the solution-designer stage; validate/reconcile them against the approved design rather than treating them as baseline evidence.

## Supplemental Task Artifact Inventory

| Artifact Path | Purpose And Scope | Evidence, Context, Or Decision Captured | Core Artifact(s) Supported | Related Requirement / Acceptance-Criteria IDs (When Applicable) | Status | Approval Applicability / State | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/token-statistics-int-overflow/graphql-token-count-contract.md` | Focused protocol/API contract for token-valued GraphQL fields. | Current `Int` defect, target `SafeInt` contract, explicit frontend codegen mapping, rejected corrupting alternatives, invariants, and coverage shape. | Requirements and design | REQ-001, REQ-002; AC-001, AC-002, AC-005 | Current; retain through implementation/review/testing | Approved with requirements basis on 2026-07-28 | Keep aligned if scalar or affected field scope changes. |

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-07-28 | Other | User screenshot `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_1865e1aabf164491b45868f4274fe50f/solution_designer_ee3aaf5445154c41a8f51f016ae489b5/context_files/ctx_0fdf5cd4e3b9__image.png` | Verify visible user journey and exact failure | Task grouping, 2026-07-21 → 2026-07-28, and the exact `3136827911` error are visible. | No |
| 2026-07-28 | Log | `rg -n -C 12 "Int cannot represent non 32-bit signed integer|usageStatisticsInPeriod" /Users/normy/.autobyteus/logs/app.log` | Locate the actual running-app failure | Lines 307 and 380 record GraphQL response serialization failures at `usageStatisticsInPeriod[0].inputTokens` for `3136827911` in `graphql@16.12.0`. | No |
| 2026-07-28 | Command | `git status --short --branch`, `git remote -v`, `git worktree list --porcelain` in the original checkout | Protect existing user work and discover isolation | Original `personal` checkout is dirty; matching dedicated worktree/branch already exists. | No |
| 2026-07-28 | Command | `git fetch --prune origin`; `git rev-parse origin/personal`; task `git rev-parse HEAD` | Refresh and verify base | Both base and task branch initially resolve to `a3beeec29`; remote default is `origin/personal`. | No |
| 2026-07-28 | Code | `autobyteus-server-ts/src/api/graphql/types/token-usage-stats.ts` at `HEAD` before candidate edits | Identify GraphQL owner and exact scalar declarations | `UsageStatistics.inputTokens` and token components in aggregate/run-summary types use `@Field(() => Int)`; mapping passes number aggregates unchanged. | Correct token-valued declarations together. |
| 2026-07-28 | Code | `autobyteus-server-ts/src/token-usage/providers/statistics-provider.ts`; `.../projections/token-usage-cost-summary-aggregate.ts` | Verify grouping and arithmetic | Provider groups ledger events by runtime/model; aggregate builder sums as JavaScript `number` without a signed-32-bit cap. | Preserve. |
| 2026-07-28 | Code | `autobyteus-server-ts/src/token-usage/providers/token-usage-ledger-store.ts`; `.../repositories/sql/token-usage-ledger-repository.ts` | Trace storage reads and period bounds | Normal request reads persisted events with `observedAt >= startDate` and `<= endDate`; no schema translation is involved. | Preserve. |
| 2026-07-28 | Code | `autobyteus-server-ts/src/agent-execution/domain/agent-run-token-usage.ts` | Verify token invariant owner | Ingestion normalization applies `asNonNegativeInt` to token-valued fields; representative data minima are zero. | Keep non-negativity in the domain; transport change owns range serialization. |
| 2026-07-28 | Data | `sqlite3 /Users/normy/.autobyteus/server-data/db/production.db '.schema token_usage_ledger_events'` and read-only `COUNT/MIN/MAX/SUM` queries | Determine storage capacity and data health | Table token columns are SQLite `INTEGER`; 88,617 rows at final probe, max individual accounting input `25,469,687`, all-time input sum above 11.5 billion, no negative representative token fields. | No migration. |
| 2026-07-28 | Data | Read-only grouped SQL with bounds 2026-07-21T00:00:00Z through 2026-07-28T00:00:00Z | Reproduce the screenshot value | `codex_app_server` / `gpt-5.6-sol`, 21,016 rows, sums `accounting_input_tokens` to exactly `3,136,827,911`. | No |
| 2026-07-28 | Code | `autobyteus-web/stores/tokenUsageStatistics.ts`; `.../TokenUsageStatistics.vue`; model/task tables; `tokenUsageStatisticsUi.ts` | Trace client states and formatting | Pinia concurrently requests task and model reports, stores existing errors, accepts finite numbers, and the Model table/cost breakdown use full `Intl.NumberFormat`; the primary Task input/output cells use `formatCompactInteger` and render `3136827911` as `3.14B`. | Preserve state and structure; change only primary Task input/output cells to full `formatInteger` to satisfy AC-002. |
| 2026-07-28 | Code | `autobyteus-web/codegen.ts`; `autobyteus-web/generated/graphql.ts` | Check generated contract | Generated token fields currently reference `Scalars['Int']`; codegen has no custom scalar mapping. | Add explicit `SafeInt` number mapping and regenerate. |
| 2026-07-28 | Repo / Probe | Existing dependency `graphql-scalars@1.25.0`; local `GraphQLSafeInt.serialize` probe | Select an existing compatible scalar | `GraphQLSafeInt` returns exact numeric `3136827911`, supports exact values through `Number.MAX_SAFE_INTEGER`, rejects unsafe integers, and advertises numeric codegen intent. | Use instead of custom/string/bigint scalar. |
| 2026-07-28 | Probe | Disposable GraphQL Code Generator 4.1.6 schema/doc/config under `/tmp`; no scalar mapping | Verify whether package scalar metadata reaches generated client types | A custom scalar loaded through schema becomes `{ input: any; output: any }` without explicit codegen config. Temporary directory was removed. | Explicit mapping is mandatory. |
| 2026-07-28 | Code / Tests | Backend token-usage E2E files and frontend store/component specs | Inventory durable coverage | Real GraphQL helpers and ledger fixtures already exist; current smaller-count and frontend error-state tests exist, but no above-32-bit transport scenario exists in baseline. | Downstream API/E2E owns durable additions. |
| 2026-07-28 | Web / Issue | `https://github.com/AutoByteus/autobyteus-workspace/issues?q=is%3Aissue+%22Int+cannot+represent+non+32-bit+signed+integer%22` and query for `"Token Statistics"` | Check for a public duplicate report | Public repository showed zero issues and no matching search results as of 2026-07-28. Absence of a report does not make the shared code defect local. | No |
| 2026-07-28 | Repo | `git blame` / `git log --follow -- autobyteus-server-ts/src/api/graphql/types/token-usage-stats.ts` | Determine defect lineage | Token-valued `Int` declarations are committed shared source, introduced across the token statistics/ledger history rather than local DB customization. | No |
| 2026-07-28 | Other | Packaged app `Info.plist` in original checkout | Correlate source/runtime version | Running artifact is AutoByteus `1.4.26`, matching current source package version; a rebuild/install is required for rollout. | Delivery/release stage if requested. |

## Relevant Existing Behavior And Production Paths

| Behavior ID | Kind (`User`/`System`/`Operational`/`Contract`) | Current Supported Trigger Or Governing Contract | Current Production Path And Lifecycle | Meaningful Current Outcome / Invariants | Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | User | User opens Settings → Token Statistics, selects the existing grouping/date range, and invokes Fetch Statistics. | `TokenUsageStatistics.vue` → Pinia `fetchStatistics` → concurrent Apollo task/model queries → `TokenUsageStatisticsResolver` → `TokenUsageStatisticsProvider` → ledger store/SQL repository → aggregate projection → GraphQL DTO scalar serialization → Pinia result/error → task/model table. | Existing report semantics are valid; current response becomes an error when any requested token-valued `Int` exceeds signed 32-bit range, preventing the report from rendering. | Screenshot, app log lines 307/380, baseline source trace, read-only SQL reproduction. |

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): `Bug Fix`
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): `Local Implementation Defect`
- Refactor posture evidence summary: The authoritative GraphQL DTO owner is correct and receives correct domain numbers. The defect is the built-in scalar declaration plus missing client custom-scalar mapping. Provider, persistence, Pinia, and UI boundaries remain coherent; no owner/file refactor is justified.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| App log + GraphQL path | Failure occurs only while serializing an otherwise computed result. | Correct the transport scalar at its owner; do not change storage or aggregation. | No |
| Source and data probes | Domain/storage/client all represent `3136827911` exactly as a number. | Existing architecture and number domain are sufficient through safe-integer range. | No |
| Codegen probe | Unknown custom scalar becomes `any` without config. | Frontend codegen owner must explicitly map `SafeInt` to `number`. | Regenerate/check generated output. |
| Baseline test inventory | Real GraphQL and UI/store paths exist but lack the above-32-bit case. | Add proportional durable regression coverage downstream; do not create a new test framework. | API/E2E stage. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/components/settings/TokenUsageStatistics.vue` | User controls and loading/empty/error/success state selection | Supported trigger; no scalar logic. | Preserve UI ownership and behavior. |
| `autobyteus-web/stores/tokenUsageStatistics.ts` | Concurrent GraphQL request orchestration, normalization, state | Accepts finite JS numbers and surfaces GraphQL errors. | Preserve; use it as response-to-UI owner. |
| `autobyteus-web/graphql/queries/token_usage_statistics_queries.ts` | Stable task/model query documents and aggregate fragment | Requests affected token fields but has no scalar-specific logic. | No query selection change required. |
| `autobyteus-server-ts/src/api/graphql/types/token-usage-stats.ts` | Authoritative GraphQL object types, scalar declarations, mappings, query boundary | Built-in `Int` is too narrow for valid token aggregates. | Replace token-valued decorators with `GraphQLSafeInt`; keep `usageReportCount` as `Int`. |
| `autobyteus-server-ts/src/token-usage/providers/statistics-provider.ts` | Supported period grouping/report projection | Produces correct runtime/model rows. | Reuse unchanged. |
| `autobyteus-server-ts/src/token-usage/projections/token-usage-cost-summary-aggregate.ts` | Sums token/cost components | Produces exact observed safe integer. | Reuse unchanged. |
| `autobyteus-server-ts/src/token-usage/providers/token-usage-ledger-store.ts` and SQL repository | Persisted-event access | Reads correct SQLite data; no 32-bit restriction. | Reuse unchanged; no migration. |
| `autobyteus-web/codegen.ts` | Generated client schema/type policy | No custom scalar mapping; unmapped `SafeInt` would become `any`. | Add explicit numeric input/output mapping. |
| `autobyteus-web/generated/graphql.ts` | Generated GraphQL schema/operation types | Baseline uses `Int`; must be regenerated, not manually maintained. | Regenerate from matching schema and verify `SafeInt` numeric types. |
| Existing backend token-usage E2E and frontend store/component specs | Durable coverage | Suitable infrastructure exists. | Extend proportionately in API/E2E stage. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-07-28 | Repro / Trace | Screenshot plus matching app log entries | Two real requests fail at the same path/value. | Stable user-visible reproduction. |
| 2026-07-28 | Probe | Read-only SQLite grouped aggregate over screenshot bounds | Exact `3136827911` value is produced from 21,016 normal rows. | Not corrupted or manually fabricated data. |
| 2026-07-28 | Probe | Local `graphql-scalars` serialization of `2147483647`, `3136827911`, `Number.MAX_SAFE_INTEGER`, and unsafe successor | `GraphQLSafeInt` preserves all safe values and rejects the unsafe successor. | Correct range contract for current JS-number domain. |
| 2026-07-28 | Probe | Disposable GraphQL Codegen 4.1.6 generation with unmapped `SafeInt` | Generated scalar/operation type becomes `any`. | Explicit `SafeInt` mapping is part of the fix. |
| 2026-07-28 | Trace | Baseline UI/store/table source plus downstream `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/token-statistics-int-overflow/api-e2e-coverage-investigation.md` | The store/model table preserve numeric values, but `TokenUsageTaskStatisticsTable.vue` calls `formatCompactInteger` for primary input/output cells; a runtime formatter probe yields `3.14B` for `3136827911`. | Narrow existing-owner presentation correction is required; no UI redesign or state change. |

## External / Public Source Findings

- Public API / spec / issue / upstream source: Public AutoByteus GitHub issue searches for the exact error and Token Statistics.
- Version / tag / commit / freshness: Checked 2026-07-28 against the public repository issue index; zero issues were present and both searches returned no results.
- Relevant contract, behavior, or constraint learned: No public duplicate is currently recorded. This does not contradict the local proof that the committed source contract affects any installation reaching a >32-bit aggregate.
- Why it matters: The ticket should be treated as a proactive shared product bug rather than a one-off database repair, while avoiding an unsupported claim that another user has already reported it.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: Running packaged app for live reproduction; read-only production SQLite for evidence; existing project GraphQL schema/ledger fixture for durable regression.
- Required config, feature flags, env vars, or accounts: Existing local app configuration only. Frontend codegen requires a matching backend GraphQL schema endpoint through `BACKEND_GRAPHQL_BASE_URL` or `NUXT_PUBLIC_GRAPHQL_BASE_URL`.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Remote fetch and dedicated worktree verification; no production data mutation.
- Cleanup notes for temporary investigation-only setup: Disposable `/tmp` codegen probe directory was removed. No services or database copies were created by solution design.

## Findings From Code / Docs / Data / Logs

1. The actual log—not only the screenshot—identifies GraphQL output serialization at `usageStatisticsInPeriod[0].inputTokens` as the failure origin.
2. The selected period legitimately sums to `3136827911`; individual rows are much smaller and SQLite preserves them. The database is healthy for this behavior.
3. Built-in GraphQL `Int` is the only relevant signed-32-bit boundary on the production path.
4. The same token-value concept is declared repeatedly across the shared token-usage GraphQL object family. Correcting only the logged field would leave equivalent defects in task aggregate/run summary paths.
5. The established domain/client contract is JavaScript `number`; `GraphQLSafeInt` fixes the range without a string/bigint conversion.
6. Endpoint-based codegen needs an explicit custom-scalar mapping or type safety silently degrades to `any`.
7. This is shared committed source behavior, so any installation can reproduce it after enough supported aggregation. No public duplicate issue was found, so impact breadth is inferred from the production path rather than claimed from reports.

## Persisted Data Transition Evidence (When Applicable)

- Current stored subject, location, representative shape, and approximate volume: `/Users/normy/.autobyteus/server-data/db/production.db`, `token_usage_ledger_events`, 88,617 rows at final probe; token columns are SQLite `INTEGER`.
- Relevant code-model, serialization, semantic, or physical-store change: GraphQL output scalar declarations and generated client schema types only.
- Normal readers and writers, including unknown/extra-field behavior: SQL repository reads/writes the same ledger shape; provider and aggregate projection consume it unchanged.
- Representative direct-read or compatibility evidence: Read-only normal-column aggregate reproduces the exact logged value; no historical shape or alternate decoder is involved.
- Required semantics and invariants preserved by direct use: `Yes` — all events and sums retain their existing meaning and numeric values.
- Physical storage, privacy/security, disposal, rebuild, or operational constraints: Production DB was queried read-only; row identities/raw payloads were not copied into artifacts. Stored data must not be rewritten.
- Concrete benefit, cost, and risk of migration if it remains a candidate: No benefit; migration would add I/O, downtime/corruption, backup, and rollout risk without changing the already-correct data.
- Existing migration framework or lifecycle constraints, only if migration may be required: N/A; persisted data is not affected.

## Constraints / Dependencies / Compatibility Facts

- Use the existing `graphql-scalars` dependency; do not invent a new scalar.
- The domain remains the owner of token non-negativity; `GraphQLSafeInt` owns exact safe-integer response serialization.
- The primary Task-table input/output cells must show exact decimal digits with locale separators permitted. Compact notation remains acceptable only for secondary explanatory cache/thinking sublines.
- Apply the scalar coherently to token-valued fields in the shared token-usage GraphQL family, not only the first field named in the log.
- Keep non-token `usageReportCount` on built-in `Int` for this scope.
- Map `SafeInt` explicitly to frontend TypeScript `number` and regenerate output from the matching backend schema.
- Do not cap, round, stringify, drop rows, alter date bounds, change pricing, or add database compatibility/migration machinery.
- A packaged app rebuild/source launch is required before the installed 1.4.26 runtime can demonstrate the correction.

## Open Unknowns / Risks

- Non-blocking rollout risk: the installed app remains unchanged until rebuilt/reinstalled or launched from updated source.
- Non-blocking numeric-domain risk: values above `Number.MAX_SAFE_INTEGER` require a future explicitly approved bigint/string contract; current representative data is orders of magnitude below it.
- Working-tree coordination risk: candidate implementation/test edits appeared before the current solution handoff. The implementation owner must reconcile them with this canonical package, add the Task-table presentation correction, and report provenance in its handoff.
- Blocking unknowns: None.

## Notes For Implementation And Code Review

Follow the approved GraphQL contract supplement and revised design spec. Preserve the provider, aggregate, persistence, query documents, Pinia behavior, UI structure/state, and unrelated error handling. Change `TokenUsageTaskStatisticsTable.vue` primary input/output cells to the existing full `formatInteger` formatter; compact formatting may remain in secondary explanatory sublines. Confirm the generated file is produced by codegen and contains numeric `SafeInt` types. Do not treat the current uncommitted source/test diff as reviewed or complete merely because it matches part of the target; implementation must own, validate, and report it through the normal handoff.

## Downstream Rework Evidence

### API/E2E Finding Resolved In This Revision

- Source: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/token-statistics-int-overflow/api-e2e-coverage-investigation.md`, initial coverage investigation by `api_e2e_engineer`.
- Finding: AC-002 requires exact decimal digits in the rendered report, but `autobyteus-web/components/settings/token-usage/TokenUsageTaskStatisticsTable.vue` used `formatCompactInteger`, producing `3.14B` for `3136827911`.
- Classification: `Design Impact` / `Requirement Gap` for the prior design; not a new product use case. The exact-display requirement was already approved in AC-002, while the design incorrectly preserved a conflicting formatter.
- Resolution: Requirements and design now explicitly modify only the Task table's primary input/output cells to use existing `formatInteger`. Secondary cache/thinking sublines may remain compact. Controls, table structure, grouping, state, provider, persistence, and unrelated errors remain unchanged.
- Downstream local-fix items preserved for API/E2E: add `tokenUsageTaskStatisticsInPeriod` to the overflow fixture, initialize native AppConfig/test DB as required by the harness, and add store/table exact-value assertions after implementation/source review.
