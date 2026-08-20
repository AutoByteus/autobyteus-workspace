# Investigation Notes

## Investigation Status

- Bootstrap Status: `Complete`
- Current Status: `Complete; requirements approved for solution design`
- Investigation Goal: Trace live and restart-time Token-tab statistics and price data end to end, verify durable storage/read behavior, identify the exact production defect, and define a design-ready correction boundary.
- Scope Classification (`Small`/`Medium`/`Large`): `Medium`
- Scope Classification Rationale: Backend persistence and GraphQL reads are correct, but the defect affects standalone and team-member cache readiness, live/hydration ordering, complete Token Meter field fidelity, and preservation of the existing team-total provenance fix.
- Scope Summary: Existing agent/team run token statistics and estimated prices must remain observable after restart/reopen even when new live events populate the process-local store before the Token tab hydrates its subject.
- Primary Questions To Resolve:
  - What data source feeds the Token tab while a run is live? **Resolved:** process-local Pinia summaries accumulated from websocket deltas.
  - Which token-usage and pricing fields are stored durably, and where? **Resolved:** one cumulative SQLite `token_usage_run_records` row per canonical run, including tokens, costs/pricing, model/runtime, prompt/context, identity, report count, and timestamps.
  - Which API restores those fields? **Resolved:** existing network-only GraphQL run, team, and team-member summary queries.
  - Does the frontend hydrate persisted usage? **Resolved:** it intends to, but standalone/member hydration is wrongly skipped whenever any live-created summary already exists.
  - Is pricing missing independently? **Resolved:** no for the reported run. The database and GraphQL response contain estimated USD costs; the frontend is displaying a partial live object whose cost deltas are null.

## Request Context

The user reports that the right-side Token tab appears memory-backed because shutting down the server and reopening the app leaves token totals and prices empty. The supplied screenshot shows `0` gross input/output/estimate values, `price missing`, runtime `unknown`, latest model `gpt-5.6-sol`, and `2 model calls` for the selected focused team member.

Reference image: `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_ed927d6552be4ee296cf135ccac0b128/solution_designer_98982fbb3b1b48dfa9d301719b41a3c5/context_files/ctx_47ba7a9ec6b1__image.png`

The image is stored under the current request run, but its visible task title identifies an earlier task. The task was matched through the team history index to `software_engineering_team_cd9a33ea0d3e495896092850ca3f18cd`; this avoids querying the current request's unrelated run IDs.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): `Git` super-repository with application/package subdirectories.
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/token-statistics-persistence`
- Current Branch: `codex/token-statistics-persistence`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin personal` succeeded on 2026-08-20 before branch creation.
- Task Branch: `codex/token-statistics-persistence`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None.
- Notes For Downstream Agents: Authoritative artifacts and any implementation must remain in this dedicated ticket worktree. Frontend dependencies are not installed in the worktree; provision/reuse them without modifying the shared checkout during implementation.
- Post-bootstrap remote movement: `origin/personal` advanced by eight Electron-isolation/finalization commits while investigation and design were in progress. Repeated targeted `git diff HEAD..origin/personal` checks showed no changes in the token store, workspace hydration composable, token-usage server modules, or team token stream contract paths; downstream should still refresh/integrate at its normal lifecycle boundary.

## Supplemental Task Artifact Inventory

None. The screenshot reference and material runtime/data results are recorded directly in these notes.

## Source Log

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-08-20 | Other | User report and supplied screenshot path above | Establish the observed symptom and selected UI subject | Zero/null usage fields coexist with model name and two reports after restart, consistent with a fresh partial live cache | No |
| 2026-08-20 | Command | `git symbolic-ref refs/remotes/origin/HEAD`; `git fetch origin personal`; `git worktree add -b codex/token-statistics-persistence ... origin/personal` | Resolve and create isolated authoritative workspace | Remote default is `origin/personal`; dedicated worktree created from refreshed remote commit `1b2e9b94d` | No |
| 2026-08-20 | Doc | `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/.codex/skills/solution-designer/design-principles.md` | Apply canonical design workflow | Design must be behavior/spine/ownership led and explicit about persistence transition, replacement, and removal | No |
| 2026-08-20 | Code | `autobyteus-web/stores/tokenUsageMeterStore.ts` | Inspect frontend usage cache, live merges, and server fetch writes | `runSummaries`, `teamSummaries`, and `teamAgentSummaries` are process-local maps. Live events create run/member partials. Only team totals have `live_partial`/`ledger_backed` provenance and readiness helpers. | Yes—design unified readiness/convergence |
| 2026-08-20 | Code | `autobyteus-web/composables/useTokenUsageWorkspaceScope.ts` | Trace Token-tab identity and hydration guards | Standalone guard returns if `getRunSummary(runId)` exists; member guard returns if `getMemberSummary(identity)` exists. Team total correctly calls `needsTeamRunSummaryHydration`. | Yes—primary defect location |
| 2026-08-20 | Code | `autobyteus-web/graphql/queries/token_usage_meter_queries.ts`; `autobyteus-web/types/tokenUsageMeter.ts` | Verify API field coverage | Existing network-only run/team/member queries request complete tokens, costs, unit prices, pricing status, model/runtime, prompt/context, report count, and timestamps. | No backend query expansion needed by default |
| 2026-08-20 | Code | `autobyteus-web/components/workspace/usage/TokenUsageMeterPanel.vue`; `TeamTokenUsageSummary.vue` | Determine whether presentation calculates or sources values | Components render supplied summaries and do not own provider pricing; the misleading UI originates upstream in subject hydration/cache readiness. | Preserve presentational boundary |
| 2026-08-20 | Code/Doc | `autobyteus-server-ts/prisma/schema.prisma`; `autobyteus-server-ts/docs/modules/token_usage.md`; `src/token-usage/providers/token-usage-run-store.ts`; `src/token-usage/services/token-usage-run-accumulator.ts`; `src/agent-execution/events/processors/token-usage/token-usage-run-persistence-transformer.ts`; `src/api/graphql/types/token-usage-stats.ts` | Trace durable writer and reader paths | Persistence is awaited, serialized per run, and stores a cumulative current record. GraphQL summaries read current records. The persisted event payload includes `run_summary_after_event`. | No persistence repair needed |
| 2026-08-20 | Code | `autobyteus-server-ts/src/agent-team-execution/domain/team-agent-event.ts`; `.../team-agent-event-adapter.ts`; `.../team-agent-event-websocket-projector.ts`; `autobyteus-team-stream-contracts/src/team-agent-message-dtos.ts`; `autobyteus-web/services/agentStreaming/teamStreamDtoAdapters.ts` | Trace team live token fields | Team adaptation/strict DTO carries deltas and price components but drops `runtime_kind` and `run_summary_after_event`; frontend reconstructs a run-shaped live delta payload. | Design choice: GraphQL-only readiness vs cumulative live contract |
| 2026-08-20 | Doc | `autobyteus-web/docs/agent_execution_architecture.md` around line 1070; `autobyteus-web/docs/settings.md` around line 1210 | Verify intended Token-tab contract | Docs say reopened/focused runs hydrate through current-record GraphQL summaries and already document team-total provisional-vs-ledger provenance. Current standalone/member behavior violates that contract. | Update docs after implementation if invariant is generalized |
| 2026-08-20 | Repo | `tickets/done/token-meter-team-total-row-bug/*`; commit `3f93a3cca` (`fix(web): hydrate token team totals from ledger aggregate`) | Find adjacent precedent and prior architecture decision | Prior bug had the same raw-existence/provenance flaw for `teamSummaries`; approved fix added store-owned `live_partial` vs `ledger_backed` readiness. | Reuse/generalize rather than add another ad hoc guard |
| 2026-08-20 | Data | `jq -r '.[] | select(.summary | startswith("I have one question currently")) ...' /Users/normy/.autobyteus/server-data/memory/team_run_history_index.json` | Identify screenshot task precisely | Matched screenshot title to team `software_engineering_team_cd9a33ea0d3e495896092850ca3f18cd`, created `2026-08-20T08:03:47.192Z` | No |
| 2026-08-20 | Data | `sqlite3 -readonly /Users/normy/.autobyteus/server-data/db/production.db 'PRAGMA table_info("token_usage_run_records");'` and aggregate/member queries recorded below | Verify physical schema, volume, and selected persisted values without mutation | 1,295 records; all positive totals. The selected focused run contains cumulative tokens, costs, USD/estimated status, model/runtime, prompt/context, and report count. | No migration needed |
| 2026-08-20 | Probe | HTTP POST to `http://127.0.0.1:29695/graphql` for `getTeamMemberTokenUsageSummary(teamRunId: ..., agentRunId: ...)` and `getAgentRunTokenUsageSummary(runId: ...)` | Verify normal public reader, not only direct SQLite | Both resolvers returned the selected record with 25,809,925 total tokens, USD 22.601646 estimated total cost, `gpt-5.6-sol`, `codex_app_server`, and 199 reports at probe time. | No |
| 2026-08-20 | Test | `pnpm exec vitest run stores/__tests__/tokenUsageMeterStore.spec.ts components/workspace/usage/__tests__/TokenUsageMeterPanel.spec.ts` from the shared checkout at identical commit `1b2e9b94d` | Check existing focused coverage baseline | 2 files/20 tests passed; coverage includes direct reload replacement and partial-live team-total hydration, not live-before-mount standalone/member hydration. | Add regression coverage downstream |
| 2026-08-20 | Test/Setup | Same focused Vitest command from the ticket worktree | Verify isolated test readiness | Failed before execution: `vitest` not found because worktree dependencies are not installed. No repository files were changed. | Downstream must provision dependencies in task worktree |
| 2026-08-20 | Repo/Command | `git log HEAD..origin/personal`; targeted `git diff --stat HEAD..origin/personal -- <token paths>` | Check remote movement after bootstrap and before handoff | Eight new Electron-isolation/finalization commits; no changes in investigated token paths | Refresh/integrate normally downstream |
| 2026-08-20 | Other | User approval: “the requirement is clear now then Work on the task now” | Lock the design-ready requirements basis | User approved the documented bug-fix boundary and instructed the team to proceed | Produce design and architecture-review package |

## Relevant Existing Behavior And Production Paths

| Behavior ID | Kind | Current Supported Trigger Or Governing Contract | Current Production Path And Lifecycle | Meaningful Current Outcome / Invariants | Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | System/Contract | Accepted `TOKEN_USAGE_UPDATED`; GraphQL run/team/member summary query | Runtime usage -> context/pricing enrichment -> awaited `TokenUsageRunPersistenceTransformer` -> `TokenUsageRunStore.recordObservation` -> serialized `TokenUsageRunAccumulator` transaction -> `token_usage_run_records`; GraphQL resolver -> run store -> aggregate projection | One cumulative current record per run is durable and queryable; selected screenshot data is populated | Server code/docs, Prisma schema, SQLite/GraphQL probes |
| BEH-002 | User/System | Select/open Token tab for standalone run; standalone websocket usage update | `tokenUsageHandler`/stream dispatcher -> `applyTokenUsageUpdated` -> `runSummaries[runId]`; `useTokenUsageWorkspaceScope` watcher -> `hydrateSelectedRunSummary`, but raw `getRunSummary` existence exits before `fetchAgentRunSummary` | A live partial can masquerade as hydration complete; process-local deltas replace lifetime view | Store lines 266-274; composable lines 133-146 |
| BEH-003 | User/System | Select team/focused leaf member; team websocket usage update | Team agent event -> team websocket projector/strict DTO -> frontend adapter/dispatcher -> `applyTeamTokenUsage` -> `teamAgentSummaries[agentRunId]`; member watcher -> `hydrateTeamMemberSummary`, but `getMemberSummary` existence exits before `fetchTeamMemberSummary` | Exact screenshot path can show only post-restart events while durable member record is ignored | Team contract/adapters; store lines 277-299; composable lines 66-69 and 148-171 |
| BEH-004 | User/System | Team Token tab requires aggregate row | Live team delta creates provisional team total; team-total watcher asks store `needsTeamRunSummaryHydration`; GraphQL fetch upserts ledger-backed aggregate; later live deltas retain ledger readiness | Existing team-total invariant is correct and must be preserved | Store lines 142-160, 290-297, 314-320; composable line 186; prior ticket/tests |
| BEH-005 | User | Token Meter renders selected primary summary | Workspace scope resolves selected standalone or focused leaf member -> panel render helpers -> cards/details/table | UI does not invent prices; it displays whatever summary the flawed cache path supplies | Panel/components and architecture docs |
| BEH-006 | System/Contract | Duplicate or ordered live token observations with possible hydration | Server serializes persistence per run; frontend `seenUsageKeys` rejects duplicate event IDs; live delta merge and GraphQL replacement share the same cache objects | Idempotency exists, but standalone/member source/readiness and hydration-order precedence are implicit | Accumulator, store `seenUsageKeys`, fetch/upsert methods |

## Design Health Assessment Evidence

- Change posture: `Bug Fix`
- Candidate root cause classification: `Missing Invariant` (primary) / `Shared Structure Looseness` (contributing)
- Refactor posture evidence summary: A bounded refactor is needed so the store owns a consistent summary source/readiness invariant rather than allowing composable raw-object checks to infer completeness. The existing team-total implementation is a proven local pattern; lifecycle ordering must be explicit rather than copied mechanically.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `tokenUsageMeterStore.ts` | Run/member maps mix provisional live accumulation and fetched cumulative summaries without provenance | One data shape has two completeness meanings; raw presence is semantically too loose | Generalize or replace provenance model |
| `useTokenUsageWorkspaceScope.ts` | Composable decides readiness by cached object existence for two subjects but delegates to store readiness for team total | Policy is inconsistent and partly outside the cache owner | Move readiness predicate fully into store-owned API |
| Prior team-total ticket/commit | Same defect class was fixed and reviewed successfully with `live_partial`/`ledger_backed` state | Strong local precedent; a one-off “always fetch” workaround would repeat policy | Reuse invariant shape, assess race |
| Server persistence and GraphQL probes | Correct durable values exist and normal APIs return them | Backend persistence rewrite, migration, and client calculation are unjustified | Preserve server boundary |
| Team live contract | Drops persisted cumulative payload/runtime | Contract drift contributes to partial live fidelity but GraphQL can already restore it | Decide if contract extension is necessary, not automatic |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/stores/tokenUsageMeterStore.ts` | Process-local summary cache; live delta merge; idempotency; GraphQL fetch writes | Only `teamSummaries` has source/readiness metadata | Correct owner for unified readiness and write precedence |
| `autobyteus-web/composables/useTokenUsageWorkspaceScope.ts` | Resolves selected/focused Token-tab subjects and orchestrates hydration/loading/errors | Uses invalid raw existence guards for standalone/member | Should consume store-owned readiness, not infer completeness |
| `autobyteus-web/graphql/queries/token_usage_meter_queries.ts` | Complete run/team/member summary documents | Already network-only and field-complete | Reuse unchanged unless design proves otherwise |
| `autobyteus-web/types/tokenUsageMeter.ts` | Frontend live event and cumulative summary shapes | Standalone event type omits server `run_summary_after_event`; team type comes from strict shared DTO | May need contract typing only if cumulative live path chosen |
| `autobyteus-web/components/workspace/usage/TokenUsageMeterPanel.vue` | Presentation for primary summary and UI states | Does not own data source or pricing | Keep presentation-only; minimal state wiring only if needed |
| `autobyteus-web/components/workspace/usage/TeamTokenUsageSummary.vue` | Team member rows and final team aggregate | Consumes scope summaries | Preserve layout/identity behavior |
| `autobyteus-server-ts/prisma/schema.prisma` (`TokenUsageRunRecord`) | Current cumulative persisted record | Contains all required fields | No schema/migration change |
| `autobyteus-server-ts/src/agent-execution/events/processors/token-usage/token-usage-run-persistence-transformer.ts` | Awaits record fold before emitting transformed event | Normal live event follows persistence | Supports convergence; no writer change expected |
| `autobyteus-server-ts/src/token-usage/services/token-usage-run-accumulator.ts` | Serialized per-run fold and cumulative payload construction | Returns `run_summary_after_event` | Potential canonical live snapshot already exists |
| `autobyteus-server-ts/src/api/graphql/types/token-usage-stats.ts` | Run/team/member GraphQL summary resolvers | Correctly exposes current records | Preserve authority |
| `autobyteus-server-ts/src/agent-team-execution/domain/team-agent-event.ts` and adapters/projector | Correlate and project agent usage into team stream | Omits runtime and cumulative post-event summary | Change only if approved convergence design requires it |
| `autobyteus-team-stream-contracts/src/team-agent-message-dtos.ts` | Strict shared team websocket schema | Omits runtime/cumulative summary | Coordinated boundary if changed |
| `autobyteus-web/stores/__tests__/tokenUsageMeterStore.spec.ts` | Store aggregation/replacement/provenance coverage | Direct replacement exists; no run/member readiness model | Expand proportionately |
| `autobyteus-web/components/workspace/usage/__tests__/TokenUsageMeterPanel.spec.ts` | Token-tab component/scope integration | Covers team-total partial-live hydration only | Add standalone/member live-before-mount regressions |

## Runtime / Probe Findings

| Date | Method | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-08-20 | Probe/Data | History-index `jq` query by visible screenshot title | Identified team run `software_engineering_team_cd9a33ea0d3e495896092850ca3f18cd` | Persisted-data probe targets correct historical task |
| 2026-08-20 | Probe/Data | `sqlite3 -readonly ... "SELECT COUNT(*), SUM(CASE WHEN accounting_total_tokens...) FROM token_usage_run_records"` | 1,295 rows; 0 zero-total; 1,295 positive-total | Database is not empty and is not merely an in-memory source |
| 2026-08-20 | Probe/Data | Read-only selected-run query over `token_usage_run_records` | `solution_designer_b5...` had 199 reports, 25,616,424 input, 193,501 output, 25,809,925 total, USD 16.796616 input cost, 5.80503 output cost, 22.601646 total cost, estimated status, model/runtime/prompt/context | The screenshot's zeros/nulls contradict the durable row |
| 2026-08-20 | Probe | POST GraphQL member query to running packaged backend port 29695 | Returned values matching SQLite, including model/runtime and cumulative totals/costs | Reader/API path is healthy; frontend fetch is skipped |
| 2026-08-20 | Probe | POST GraphQL standalone run query for same canonical run | Returned the same cumulative record | Both GraphQL entrypoints are healthy |
| 2026-08-20 | Test | Focused Vitest run from shared checkout at identical commit | 20/20 tests passed in 6.95s | Existing suite does not detect reported sequence |
| 2026-08-20 | Setup/Test | Focused Vitest run from ticket worktree | `vitest` command not found | Dependency setup required before authoritative implementation checks |

The database run remained active, so observed totals advanced during the investigation. Values above are a timestamped evidence snapshot, not an acceptance-test constant.

## External / Public Source Findings

N/A. No external source was needed; current repository contracts and direct local runtime/data probes were authoritative.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: A running AutoByteus backend was available through the packaged Electron process on `127.0.0.1:29695`, configured against `/Users/normy/.autobyteus/server-data`.
- Required config, feature flags, env vars, or accounts: None for read-only database and GraphQL probes.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated worktree creation; read-only SQLite commands; HTTP GraphQL POSTs; focused Vitest run from identical shared commit because worktree dependencies were absent.
- Cleanup notes for temporary investigation-only setup: No repository-resident probe artifacts were created. A rejected attempt to use `/tmp` did not create a file. No services were started/stopped or mutated by this investigation.

## Findings From Code / Docs / Data / Logs

### 1. The authoritative data is durable and complete

`TokenUsageRunPersistenceTransformer.transform()` awaits `TokenUsageRunStore.recordObservation()`. `TokenUsageRunAccumulator` serializes work by `run_id`, folds in a transaction, saves the current record, and returns an event payload whose `run_summary_after_event` is built from that persisted record. The Prisma model maps one cumulative record to `token_usage_run_records` and includes every field the Token Meter needs.

GraphQL run, team, and member resolvers read these current records. Direct probes for the screenshot's exact run returned non-zero lifetime tokens and estimated prices. Therefore the user's suspicion is understandable from the UI, but the database is not the failing owner.

### 2. The frontend intentionally keeps process-local live projections

`tokenUsageMeterStore` maintains three reactive maps. Live standalone events apply deltas into `runSummaries`; live team events apply deltas into both `teamAgentSummaries` and the team aggregate map. These projections are useful for immediate UI updates, but a fresh process begins with no historical baseline.

### 3. Raw cache existence suppresses the durable baseline

`hydrateSelectedRunSummary()` returns when `meterStore.getRunSummary(runId)` is truthy. `hydrateTeamMemberSummary()` returns when `getMemberSummary(identity)` is truthy, and `getMemberSummary` prefers `teamAgentSummaries`. Consequently, the first new live event after restart creates an object that prevents the network-only GraphQL fetch. The tab then displays only events seen since the frontend restarted.

This deterministically explains the screenshot:

- two accepted new-process events -> `2 model calls`;
- zero/null metered deltas in those observations -> zero token cards and missing component costs;
- pricing status can still be `estimated` -> the “Complete estimate” badge while numeric price fields are null;
- team DTO retains model identifier but omits runtime -> `gpt-5.6-sol` and `runtime unknown`.

### 4. The adjacent team-total bug has already been solved correctly

The `token-meter-team-total-row-bug` ticket added `teamSummarySources` and store-owned `needsTeamRunSummaryHydration()`. A live-created aggregate is explicitly provisional, so its existence cannot suppress the ledger GraphQL query. Later live deltas can extend a ledger-backed value. Standalone/member maps never received the same invariant, leaving structurally identical defects.

### 5. Existing coverage misses the production ordering

Store coverage proves that an explicit upsert can replace a live standalone summary, but it does not prove the Token-tab lifecycle actually performs the fetch. Component coverage proves only partial-live team-total hydration. There is no scenario where a run/member live summary exists before panel mount and the test expects the corresponding GraphQL method to be called.

## Persisted Data Transition Evidence (When Applicable)

- Current stored subject, location, representative shape, and approximate volume: `/Users/normy/.autobyteus/server-data/db/production.db`, table `token_usage_run_records`, 1,295 rows at probe time; one cumulative record per canonical run. Representative row contains identity, observation ordering, report count, cumulative token components, cost components, pricing JSON/status/currency, model/runtime, prompt/context, and idempotency state.
- Relevant code-model, serialization, semantic, or physical-store change: None required. The defect is frontend readiness, not stored representation.
- Normal readers and writers, including unknown/extra-field behavior: Writer is the awaited per-run accumulator/repository transaction. Normal readers are current-record store/projections and GraphQL run/team/member/statistics resolvers. Existing readers already preserve the required fields.
- Representative direct-read or compatibility evidence: Read-only SQLite and public GraphQL probes returned matching cumulative meaning for the exact screenshot run.
- Required semantics and invariants preserved by direct use: `Yes` — current records already represent lifetime cumulative usage and pricing for the exact run/team identity.
- Physical storage, privacy/security, disposal, rebuild, or operational constraints: No mutation was performed. Existing history is non-disposable for this ticket and must not be reset, reassigned, or rewritten.
- Concrete benefit, cost, and risk of migration if it remains a candidate: No benefit; a migration would add operational and corruption risk while failing to correct the frontend's hydration predicate.
- Existing migration framework or lifecycle constraints, only if migration may be required: N/A. Outcome is `Directly Usable — No Migration`.

## Constraints / Dependencies / Compatibility Facts

- GraphQL uses JavaScript-safe numeric projections and already returns all required fields for observed records.
- `fetchAgentRunSummary`, `fetchTeamRunSummary`, and `fetchTeamMemberSummary` use `fetchPolicy: 'network-only'`.
- Team aggregate identity is keyed by requested `teamRunId`; preserve the prior ticket's explicit handling rather than trusting a payload member `runId` as aggregate identity.
- The shared team stream schema is `.strict()`. Any new cumulative/runtime fields require synchronized contract, server projector, adapter, generated/consumer type, and test changes.
- The server persistence transformer catches failures and may emit a quality flag with no cumulative public summary. Any live-cumulative design must keep the GraphQL fallback and must not label failed persistence as ledger-backed.
- The right-side Token tab and Settings > Token Statistics are different surfaces and data-selection contracts.
- Worktree and shared checkout were at identical commit `1b2e9b94d` during baseline tests; the shared checkout's unrelated `.article-work/` was not touched.

## Open Unknowns / Risks

- The target design must choose whether to generalize the existing frontend provenance/readiness pattern only, or additionally project the already-persisted `run_summary_after_event` through live contracts. This is an implementation boundary decision, not an unresolved product requirement.
- Hydration/live overlap needs explicit sequence semantics. Although normal server publication follows awaited persistence, request/response and websocket delivery can interleave.
- A cumulative live snapshot cannot be treated as successful if persistence failed and the event contains `token_usage_persistence_unavailable` or no `run_summary_after_event`.
- The current team contract's omitted runtime is an observable fidelity issue only while the live partial is displayed. Durable GraphQL hydration restores it. Expanding the contract solely for instantaneous pre-hydration display is not independently authorized.

## Notes For Architecture Reviewer

The requirements basis was approved on 2026-08-20. Architecture review should focus on the store/composable completeness boundary and ordering rules. The backend database/schema/GraphQL current-record authority should be reused. Any team-stream contract expansion must be justified as necessary for REQ-003 rather than treated as incidental cleanup.
