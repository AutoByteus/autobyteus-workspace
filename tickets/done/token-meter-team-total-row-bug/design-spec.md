# Design Spec

## Current-State Read

The right-side Token tab is mounted by `autobyteus-web/components/layout/RightSideTabs.vue` and rendered by `autobyteus-web/components/workspace/usage/TokenUsageMeterPanel.vue`. The panel delegates selection, hydration, and store lookup to `autobyteus-web/composables/useTokenUsageWorkspaceScope.ts`, then renders the team comparison section through `autobyteus-web/components/workspace/usage/TeamTokenUsageSummary.vue`.

Current team-total data path:

1. Live token events enter the frontend as `TOKEN_USAGE_UPDATED` stream messages.
2. `autobyteus-web/services/agentStreaming/handlers/tokenUsageHandler.ts` and `teamStreamGenericMessageDispatcher.ts` call `tokenUsageMeterStore.applyTokenUsageUpdated()`.
3. `tokenUsageMeterStore.applyTokenUsageUpdated()` updates `runSummaries[memberRunId]` and also updates `teamSummaries[rootTeamRunId]` with the same live delta.
4. `useTokenUsageWorkspaceScope.teamTotalSummary` reads `meterStore.getTeamSummary(activeTeamRunId)`.
5. `useTokenUsageWorkspaceScope.hydrateTeamTotalSummary()` intends to fetch the ledger-backed aggregate through `meterStore.fetchTeamRunSummary(teamRunId)`, but returns early when `meterStore.getTeamSummary(teamRunId)` already exists.
6. `TeamTokenUsageSummary.vue` renders the supplied `teamTotalSummary` directly in the `Team total` row.

Current backend aggregate path:

- Frontend query `GET_TEAM_RUN_TOKEN_USAGE_SUMMARY` maps to GraphQL resolver `getTeamRunTokenUsageSummary(teamRunId)` in `autobyteus-server-ts/src/api/graphql/types/token-usage-stats.ts`.
- That resolver calls `TokenUsageLedgerStore.getTeamRunSummary()` in `autobyteus-server-ts/src/token-usage/providers/token-usage-ledger-store.ts`.
- The store calls `SqlTokenUsageLedgerRepository.listEventsByTeamRunId()` and aggregates all `token_usage_ledger_events` rows matching `rootTeamRunId`.

Observed defect:

- For screenshot-matching persisted team `software_engineering_team_057fd30efa5f4bd3843c744698ee7699`, the ledger aggregate is `300,875,782` gross input, `1,332,498` output, and `302,208,280` total tokens across all six team members.
- The UI `Team total` row instead shows a `solution_designer`-sized value.
- Therefore the backend aggregate exists; the frontend is treating a partial live/provisional team summary as an authoritative team total and skipping the server aggregate fetch.

Current coupling / fragmentation problems:

- `teamSummaries` is one shared map for two distinct meanings:
  - provisional live aggregate accumulated from events the browser has observed;
  - authoritative ledger-backed team aggregate fetched by `fetchTeamRunSummary()`.
- The hydration guard checks only value existence, not source/completeness.
- `upsertSummary()` can implicitly seed `teamSummaries[rootTeamRunId]` with a member summary when no team summary exists, which is the same aggregate/member aliasing smell in another write path.
- The presentational component has no defect; it is correctly thin.

Constraints:

- The Token tab must keep focused member primary behavior from the previous token-meter focus redesign.
- The Team section must keep using server-owned token/cost summaries; the UI must not recalculate authoritative totals.
- Backend GraphQL aggregate APIs already exist and should be reused.
- No compatibility branch should preserve the wrong `Team total` behavior.

## Intended Change

Make `Team total` hydration source-aware. A provisional live team summary may be shown transiently while the aggregate is loading, but it must not suppress the ledger-backed team aggregate fetch. Once the ledger-backed aggregate is fetched, it becomes the team-total baseline; later live token events continue updating that baseline.

Target behavior:

- Opening a team Token tab always ensures the `Team total` row is backed by `fetchTeamRunSummary(teamRunId)` unless the store already knows that the current team summary is ledger-backed.
- Member focus changes do not change the `Team total` source or value except for legitimate new usage events.
- Member summaries and team aggregate summaries are not silently interchangeable in store writes.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix
- Current design issue found (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant and Shared Structure Looseness
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes, small/local
- Evidence:
  - `hydrateTeamTotalSummary()` uses existence of any `teamSummaries[teamRunId]` entry as a freshness/completeness signal.
  - `applyTokenUsageUpdated()` writes live deltas into the same `teamSummaries` map used by ledger-backed fetch results.
  - SQLite ledger data proves a correct backend aggregate exists and differs from the UI row.
  - `TeamTokenUsageSummary.vue` renders props only and does not own aggregation.
- Design response:
  - Add team-summary provenance/freshness ownership to `tokenUsageMeterStore`.
  - Replace the composable's existence guard with a store-owned ledger-backed guard.
  - Tighten store write rules so member summaries cannot seed team aggregate rows.
- Refactor rationale:
  - This is not a pure one-line local condition bug: the missing invariant is that a team-summary cache entry must expose whether it is ledger-backed or only provisional/live. That invariant belongs to the store that owns the summary cache, not the component.
- Intentional deferrals and residual risk, if any:
  - Backend `TokenUsageRunSummaryGraphql.runId` for `getTeamRunSummary()` can currently come from the first member event. This identity looseness is not the displayed value bug because the frontend keys team aggregates by requested `teamRunId`. Do not depend on `summary.runId` to decide team aggregate identity in this change. A future schema-tightening task can introduce an explicit summary subject/identity shape if broader API cleanup is desired.

## Terminology

- `Team aggregate summary`: the server-owned aggregate for one root team run, fetched through `getTeamRunTokenUsageSummary(teamRunId)` or built from live deltas after a ledger baseline is known.
- `Provisional live team summary`: in-memory summary produced only from live `TOKEN_USAGE_UPDATED` events observed by the current frontend session before a ledger aggregate has hydrated.
- `Ledger-backed team summary`: a team summary whose baseline came from `fetchTeamRunSummary(teamRunId)`.
- `Member summary`: a summary for one leaf member's agent run or route key.

## Design Reading Order

Read this design from abstract to concrete:

1. Data-flow spine
2. Ownership and boundary model
3. Store invariant / provenance model
4. Concrete file responsibilities
5. Migration and test sequence

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove the behavior where any existing `teamSummaries[teamRunId]` entry is accepted as a complete `Team total` and blocks aggregate hydration.
- Remove/decommission the implicit member-summary-as-team-summary fallback inside `upsertSummary()` or replace it with an explicit team-summary write path.
- Do not keep a dual-path branch that preserves the old incorrect `Team total` values for partial live summaries.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | User opens/focuses team Token tab | Correct `Team total` row rendered | Token usage workspace scope + token usage meter store | This is the reported UI bug path. |
| DS-002 | Return-Event | Live `TOKEN_USAGE_UPDATED` event | Store run/team summaries updated | `tokenUsageMeterStore` | Live updates must remain responsive without being mistaken for complete historical aggregate. |
| DS-003 | Primary End-to-End | GraphQL team summary request | Ledger-backed team aggregate cached | Server token ledger + frontend store | This is the authoritative team-total data source. |
| DS-004 | Bounded Local | Store team summary write | Source/freshness state updated | `tokenUsageMeterStore` | The missing invariant lives here. |
| DS-005 | Bounded Local | Team summary component render | Table row displays supplied summary | `TeamTokenUsageSummary.vue` | Confirms rendering remains thin and does not own aggregation. |

## Primary Execution Spine(s)

- DS-001: `RightSide Token Tab -> TokenUsageMeterPanel -> useTokenUsageWorkspaceScope -> tokenUsageMeterStore aggregate guard/hydration -> TeamTokenUsageSummary -> Team total row`
- DS-003: `useTokenUsageWorkspaceScope -> tokenUsageMeterStore.fetchTeamRunSummary -> GraphQL getTeamRunTokenUsageSummary -> TokenUsageLedgerStore -> token_usage_ledger_events aggregate -> tokenUsageMeterStore ledger-backed team summary`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | When the user opens the Token tab in a team workspace, the panel asks the workspace scope composable for primary/member rows and team total. The composable asks the store whether the team total has a ledger-backed summary; if not, it initiates aggregate hydration. The component renders the resulting summary as the final `Team total` row. | Token tab, workspace scope, token usage store, team total row | `useTokenUsageWorkspaceScope` for orchestration; `tokenUsageMeterStore` for cache correctness | Member display names, loading/error flags, formatting |
| DS-002 | Live token events update the member run summary and the team aggregate cache. If the team aggregate was not ledger-backed yet, the store marks that team summary provisional/live so the later Token tab hydration still fetches the server aggregate. If it was ledger-backed, live deltas extend the ledger baseline. | Live token event, run summary, team summary cache, provenance state | `tokenUsageMeterStore` | Event dedupe, cache/cost merge policy |
| DS-003 | The aggregate hydration action performs a network-only GraphQL query, receives the server-owned aggregate, normalizes unit prices, stores it under the requested `teamRunId`, and marks it ledger-backed. | Team summary request, GraphQL resolver, server ledger, store cache | Backend ledger for aggregation; frontend store for cache state | Apollo client, pricing/unit-price normalization |
| DS-004 | Every write to `teamSummaries` updates source/freshness metadata at the same time so callers do not infer completeness from value existence. | Store write, summary provenance | `tokenUsageMeterStore` | Optional timestamp/debug metadata |
| DS-005 | The table component only formats supplied values. It does not sum rows or choose between member/team sources. | Team table row, total row | `TeamTokenUsageSummary.vue` | Localization, compact formatting |

## Spine Actors / Main-Line Nodes

- `RightSideTabs.vue`: tab surface that makes the Token panel visible.
- `TokenUsageMeterPanel.vue`: Token tab layout that renders primary focused summary and Team section.
- `useTokenUsageWorkspaceScope.ts`: UI-scope resolver and hydration orchestrator for the active workspace.
- `tokenUsageMeterStore.ts`: authoritative frontend cache owner for run summaries, team summaries, live event merge, GraphQL hydration, and team-summary provenance.
- Server token ledger (`TokenUsageLedgerStore` + repository): authoritative persisted aggregate owner.
- `TeamTokenUsageSummary.vue`: presentational team summary table.

## Ownership Map

- `RightSideTabs.vue`
  - Owns tab mounting only.
  - Must not own token summary selection.
- `TokenUsageMeterPanel.vue`
  - Owns layout and composing child sections.
  - Must not own summary cache freshness or aggregation.
- `useTokenUsageWorkspaceScope.ts`
  - Owns active-workspace token-usage subject selection and hydration orchestration.
  - May ask the store if a team aggregate is already ledger-backed.
  - Must not infer store completeness from raw object existence.
- `tokenUsageMeterStore.ts`
  - Owns run/team summary maps, event dedupe, live summary merge, GraphQL summary hydration, and team-summary source/freshness state.
  - Must expose an explicit boundary such as `hasLedgerBackedTeamSummary(teamRunId)` or `needsTeamRunSummaryHydration(teamRunId)`.
  - Must prevent member summaries from being silently used as team aggregates.
- Backend token ledger
  - Owns authoritative persisted token and cost aggregation.
  - Must remain the source of truth for team aggregate totals.
- `TeamTokenUsageSummary.vue`
  - Owns rendering/formatting of rows it receives.
  - Must not sum member rows or choose aggregate source.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `TokenUsageMeterPanel.vue` | `useTokenUsageWorkspaceScope` + `tokenUsageMeterStore` | UI composition boundary for Token tab | Summary freshness, aggregate calculation, team/member source selection |
| GraphQL query constants in `token_usage_meter_queries.ts` | Server GraphQL resolver + ledger store | Declarative frontend transport query | Token accounting policy or cache provenance |
| `TeamTokenUsageSummary.vue` | Parent composable/store | Table rendering | Aggregation, hydration, source fallback |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| `hydrateTeamTotalSummary()` guard condition `meterStore.getTeamSummary(normalizedTeamRunId)` | Existence does not prove team aggregate completeness. | Store-owned ledger-backed guard such as `meterStore.needsTeamRunSummaryHydration(teamRunId)`. | In This Change | This is the direct bug. |
| Implicit fallback in `upsertSummary()` that stores a member summary into `teamSummaries[rootTeamRunId]` when no team summary exists | It aliases member summaries to team total cache and preserves the same data-model looseness. | Explicit team summary write path in `fetchTeamRunSummary()` plus provenance metadata. | In This Change | Avoids another route to the same bug. |
| Any component-level attempt to derive `Team total` from first row/focused row | Would duplicate policy outside the store and make bug recur. | Server aggregate via store hydration. | In This Change | Add test coverage to enforce. |
| Backend `runId` identity ambiguity for team aggregate summaries | Broader API semantic tightening could make team aggregate identity clearer. | Future explicit summary subject identity if needed. | Follow-up | Not required for current value bug; current design forbids depending on this ambiguity. |

## Return Or Event Spine(s) (If Applicable)

- DS-002 live event spine:
  `Server TOKEN_USAGE_UPDATED -> agentStreaming handler -> tokenUsageMeterStore.applyTokenUsageUpdated -> runSummaries/member row + teamSummaries/provenance -> Vue reactivity -> Token tab rows update`

Event spine rule:

- Live events may update the visible aggregate, but before ledger hydration they mark the team summary as provisional/live, not complete.
- After ledger hydration, live events preserve ledger-backed status and extend the visible team total.

## Bounded Local / Internal Spines (If Applicable)

### Store team-summary write spine

Parent owner: `tokenUsageMeterStore`

`Normalize source -> Write summary map -> Update provenance state -> Expose typed guard -> UI hydration decision`

Why it matters: this is the missing invariant. Cache values and source metadata must change together; callers must not reconstruct completeness from summary fields.

### Token tab hydration spine

Parent owner: `useTokenUsageWorkspaceScope`

`Active team id changes -> Ask store if hydration needed -> Set loading/error state -> Fetch aggregate -> Render final total row`

Why it matters: the composable owns when to hydrate for the visible workspace, but not how to decide if a cached summary is authoritative.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Unit-price normalization | DS-002, DS-003 | `tokenUsageMeterStore` | Ensure `unitPrices` has complete shape before storage. | Existing store consumers expect complete unit price objects. | Component would duplicate normalization. |
| Loading/error state | DS-001, DS-003 | `useTokenUsageWorkspaceScope` | Track visible hydration state for active team. | UI needs lightweight loading/error display. | Store would become UI-specific. |
| Formatting/localization | DS-005 | `TeamTokenUsageSummary.vue` | Format compact integers, costs, and status text. | Pure presentation. | Store would contain display concerns. |
| Event dedupe | DS-002 | `tokenUsageMeterStore` | Avoid double-applying live token events. | Live updates can be replayed/reconnected. | Composable/component would duplicate event policy. |
| Backend persistence/aggregation | DS-003 | Server token ledger | List and aggregate all persisted team events. | Source of truth for historical team total. | Frontend would recalculate authoritative totals. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Fetch team aggregate | Existing GraphQL `GET_TEAM_RUN_TOKEN_USAGE_SUMMARY` + server `TokenUsageLedgerStore` | Reuse | Backend already returns aggregate from persisted events. | N/A |
| Store run/team summaries | Existing `tokenUsageMeterStore` | Extend | Store already owns summary maps and live/GraphQL merge. | N/A |
| Workspace hydration | Existing `useTokenUsageWorkspaceScope` | Extend | Composable already owns active workspace hydration orchestration. | N/A |
| Team table rendering | Existing `TeamTokenUsageSummary.vue` | Reuse | Component is correctly presentational. | N/A |
| Regression coverage | Existing frontend store/component tests | Extend | Tests already cover token meter and store semantics. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Web Token Usage Store | Summary cache, live event merge, GraphQL hydration, team summary provenance | DS-002, DS-003, DS-004 | Token tab and other token usage consumers | Extend | Add source/freshness invariant. |
| Web Token Usage Workspace Scope | Active selection, member rows, visible hydration loading/errors | DS-001, DS-003 | Token Meter panel | Extend | Use store guard, not raw summary existence. |
| Web Token Usage Components | Presentational rendering | DS-001, DS-005 | User-facing Token tab | Reuse | No aggregation logic. |
| Server Token Usage Ledger | Persisted authoritative aggregate | DS-003 | Frontend store | Reuse | No value aggregation change needed. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/stores/tokenUsageMeterStore.ts` | Web Token Usage Store | Store boundary | Add team summary source/provenance state and explicit guard/action for aggregate hydration. | Existing owner for summaries/live/GraphQL. | Uses existing `TokenUsageRunSummary`. |
| `autobyteus-web/composables/useTokenUsageWorkspaceScope.ts` | Web Token Usage Workspace Scope | Workspace scope boundary | Replace existence guard with store-owned `needsTeamRunSummaryHydration` / `hasLedgerBackedTeamSummary`. | Existing owner for active team hydration. | Uses store API. |
| `autobyteus-web/components/workspace/usage/TeamTokenUsageSummary.vue` | Web Token Usage Components | Presentational component | No required logic change; may stay untouched. | Component already renders supplied total summary. | N/A |
| `autobyteus-web/stores/__tests__/tokenUsageMeterStore.spec.ts` | Durable frontend coverage | Store test boundary | Assert live partial summaries are not ledger-backed and ledger fetch marks them backed; member summaries do not seed team aggregate. | Existing store coverage file. | N/A |
| `autobyteus-web/components/workspace/usage/__tests__/TokenUsageMeterPanel.spec.ts` | Durable frontend coverage | Component/composable integration | Assert partial live `solution_designer` team summary does not block aggregate fetch/display. | Existing Token tab coverage file. | N/A |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Team summary provenance guard | Keep local in `tokenUsageMeterStore.ts` unless it grows | Web Token Usage Store | Used only by the store/composable boundary now. | Yes | Yes | A generic cache helper or UI flag bag |
| Source values (`live_partial`, `ledger_backed`) | Local type in store | Web Token Usage Store | Small store-owned invariant. | Yes | Yes | A new cross-app enum before needed |
| Fetch-needed predicate | Store function (`needsTeamRunSummaryHydration`) | Web Token Usage Store | Single authoritative decision point. | Yes | Yes | Duplicated composable condition |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `teamSummaries[teamRunId]` | No, currently value can be live partial or ledger aggregate. | No | High | Add store-owned source/provenance metadata and use it for hydration guard. |
| `TokenUsageRunSummary.runId` for team aggregate payloads | No, backend can return first member run id for a team aggregate. | N/A | Medium | Do not use `summary.runId` to determine team aggregate identity in this change; key by requested `teamRunId`. Defer schema tightening. |
| `upsertSummary(summary)` team write behavior | No, member summaries can seed team map. | No | High | Remove implicit team-map seeding for member summaries, or require explicit team write context/options. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/stores/tokenUsageMeterStore.ts` | Web Token Usage Store | Token usage cache boundary | Own team summary map, provenance metadata, explicit ledger-backed/needs-hydration API, live event merge, GraphQL fetch write rules, and removal of implicit member-as-team fallback. | The store is the only place with all summary write paths. | Existing summary type + local provenance type. |
| `autobyteus-web/composables/useTokenUsageWorkspaceScope.ts` | Web Token Usage Workspace Scope | Token tab scope/hydration boundary | Ask the store whether the team aggregate needs hydration, then fetch and expose loading/error state. | The composable owns active workspace orchestration. | Store guard. |
| `autobyteus-web/components/workspace/usage/TeamTokenUsageSummary.vue` | Web Token Usage Components | Presentational renderer | Render `teamTotalSummary` as received; no source decision or aggregate math. | Rendering responsibility remains singular. | Existing formatting helper. |
| `autobyteus-web/stores/__tests__/tokenUsageMeterStore.spec.ts` | Tests | Store invariant coverage | Cover provenance transitions and no member-summary aliasing. | Existing store tests. | N/A |
| `autobyteus-web/components/workspace/usage/__tests__/TokenUsageMeterPanel.spec.ts` | Tests | Token tab integration coverage | Cover partial-live summary blocking regression and focus stability. | Existing Token panel tests. | N/A |

## Ownership Boundaries

The authoritative token data boundary remains:

`Server token ledger -> GraphQL summary query -> tokenUsageMeterStore -> workspace composable -> Token tab components`

Boundary changes:

- `tokenUsageMeterStore` becomes the authoritative frontend owner of team-summary source/completeness. Callers must not inspect `teamSummaries` existence directly as a completeness signal.
- `useTokenUsageWorkspaceScope` owns when to hydrate for the active workspace, but it must ask the store whether hydration is needed.
- `TeamTokenUsageSummary.vue` remains below the authoritative boundary and must not bypass the store by computing totals from `rows`.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `tokenUsageMeterStore` team summary cache boundary | `teamSummaries`, provenance state, live merge, GraphQL fetch writes | `useTokenUsageWorkspaceScope`, Token tab tests | Caller checks `getTeamSummary()` existence to decide aggregate freshness. | Add/extend store methods such as `needsTeamRunSummaryHydration(teamRunId)` and `hasLedgerBackedTeamSummary(teamRunId)`. |
| Server GraphQL team aggregate boundary | Ledger repository and aggregate builder | Frontend store | Frontend sums member rows for authoritative `Team total`. | Use `fetchTeamRunSummary()`; only add server API if existing query cannot satisfy. |
| Token tab component boundary | Formatting and markup | Parent panel/composable | Component selects first/focused member as total. | Keep source selection in composable/store. |

## Dependency Rules

Allowed:

- `TokenUsageMeterPanel.vue` may depend on `useTokenUsageWorkspaceScope` output.
- `useTokenUsageWorkspaceScope.ts` may depend on `tokenUsageMeterStore` explicit methods for summaries and hydration need.
- `tokenUsageMeterStore.ts` may depend on GraphQL query constants and Apollo client.
- `TeamTokenUsageSummary.vue` may depend on formatting helpers and summary props.
- Store tests may inspect public store methods/state needed for behavior.

Forbidden:

- UI components must not sum member rows to create authoritative `Team total`.
- `useTokenUsageWorkspaceScope` must not decide team aggregate freshness from `getTeamSummary()` existence.
- Store `upsertSummary()` must not silently put a member summary into `teamSummaries[rootTeamRunId]` as a fallback aggregate.
- Callers must not use `TokenUsageRunSummary.runId === rootTeamRunId` as the only proof of team aggregate identity because backend team summaries currently have ambiguous `runId` semantics.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `getTeamSummary(teamRunId)` | Team aggregate cache value | Return current visible summary if any | Root team run id string | Value may exist before ledger hydration; use guard for completeness. |
| `hasLedgerBackedTeamSummary(teamRunId)` or `needsTeamRunSummaryHydration(teamRunId)` | Team aggregate provenance | Tell callers whether server aggregate hydration is needed | Root team run id string | New/changed store boundary. |
| `fetchTeamRunSummary(teamRunId)` | Team aggregate hydration | Fetch server aggregate and mark cache ledger-backed | Root team run id string | Must store under requested team id. |
| `applyTokenUsageUpdated(payload)` | Live usage event | Merge live deltas into run and team caches and update provenance | Payload with `run_id`, optional `root_team_run_id` | Before ledger hydration, team summary remains provisional. |
| `fetchTeamMemberSummary({ teamRunId, memberAgentRunId, memberRouteKey })` | Member summary hydration | Fetch one member's summary | Explicit team id + member run id and/or route key | Must not write team aggregate cache. |
| GraphQL `getTeamRunTokenUsageSummary(teamRunId)` | Server team aggregate | Return ledger aggregate for root team run | Root team run id string | Existing backend boundary. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `getTeamSummary(teamRunId)` | Yes, value lookup only | Yes | Medium if used as freshness signal | Add separate provenance guard. |
| `fetchTeamRunSummary(teamRunId)` | Yes | Yes | Low | Keep writing by requested id. |
| `upsertSummary(summary)` | No, currently can write both run and team maps implicitly | No | High | Restrict to run summary or require explicit team scope/options. |
| GraphQL team summary response `runId` | No for team aggregate identity | Partially | Medium | Do not depend on it; future schema cleanup can tighten. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Provisional live team summary | Proposed local source label `live_partial` | Yes | Low | Use only inside store. |
| Ledger-backed team summary | Proposed local source label `ledger_backed` | Yes | Low | Use only inside store. |
| Team total | Existing UI label `Team total` | Yes | Low | Keep label; fix data source. |
| Team summary cache | Existing `teamSummaries` | Yes as value map, incomplete as provenance | Medium | Pair with provenance map/method. |

## Applied Patterns (If Any)

- Repository pattern: existing server token usage repository remains the persistence boundary for ledger events.
- Store/cache pattern: `tokenUsageMeterStore` remains a frontend cache owner; this change adds explicit cache source metadata.
- Adapter/mapper pattern: GraphQL fetch actions normalize server `unitPrices` into frontend store shape.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/stores/tokenUsageMeterStore.ts` | File | Token usage store | Add provenance metadata and team aggregate freshness API; tighten write rules. | Existing cache/live/GraphQL owner. | Component rendering or UI loading copy. |
| `autobyteus-web/composables/useTokenUsageWorkspaceScope.ts` | File | Token tab scope resolver | Use store freshness API for active team aggregate hydration. | Existing active workspace owner. | Token/cost aggregation math. |
| `autobyteus-web/components/workspace/usage/TeamTokenUsageSummary.vue` | File | Presentational Team table | No source change expected. | Existing renderer. | Store mutation, fetch calls, aggregate derivation. |
| `autobyteus-web/stores/__tests__/tokenUsageMeterStore.spec.ts` | File | Store unit tests | Provenance and write-rule regression coverage. | Existing store tests. | UI layout assertions. |
| `autobyteus-web/components/workspace/usage/__tests__/TokenUsageMeterPanel.spec.ts` | File | Component/composable integration tests | Token tab regression coverage for partial live summary + aggregate fetch. | Existing Token panel tests. | Backend ledger E2E setup. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-web/stores` | Main-Line Domain-Control for frontend state | Yes | Low | Existing Pinia state boundary. |
| `autobyteus-web/composables` | UI scope/orchestration | Yes | Low | Existing composable pattern for active workspace state. |
| `autobyteus-web/components/workspace/usage` | Presentation | Yes | Low | Keep rendering concerns here only. |
| `autobyteus-server-ts/src/token-usage` | Persistence-provider / aggregate source | Yes | Low | Reused unchanged for value aggregation. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Hydration guard | `if (meterStore.needsTeamRunSummaryHydration(teamRunId)) await meterStore.fetchTeamRunSummary(teamRunId)` | `if (meterStore.getTeamSummary(teamRunId)) return` | Distinguishes value existence from authoritative aggregate readiness. |
| Store provenance | live event before fetch writes `{ source: 'live_partial' }`; GraphQL aggregate writes `{ source: 'ledger_backed' }`; live event after fetch keeps `ledger_backed` | One `teamSummaries` object with no source metadata | Prevents partial live `solution_designer` totals becoming `Team total`. |
| Component boundary | `<TeamTokenUsageSummary :team-total-summary="teamTotalSummary" />` formats props only | `const total = rows.reduce(...)` in component | Keeps server-owned accounting boundary intact. |
| Team identity | Store indexes aggregate by requested `teamRunId` | Infer aggregate identity from `summary.runId` | Avoids current backend `runId` ambiguity for team aggregate summaries. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep skipping server fetch when any team summary exists | Minimal code and preserves current live-only behavior | Rejected | Replace with source-aware guard. |
| Compute team total by summing visible member rows in the component | Could mask the bug visually | Rejected | Use server aggregate through `fetchTeamRunSummary()`. |
| Keep member-summary fallback in `upsertSummary()` for old callers | Avoids changing store behavior | Rejected | Remove or make team write explicit; member summary must not become aggregate. |
| Add a separate compatibility field for old partial total | Not useful to users | Rejected | Display one correct `Team total`. |

## Derived Layering (If Useful)

- Presentation: `TeamTokenUsageSummary.vue`, `TokenUsageMeterPanel.vue`
- UI scope orchestration: `useTokenUsageWorkspaceScope.ts`
- Frontend state/cache boundary: `tokenUsageMeterStore.ts`
- Transport/API: GraphQL query constants + Apollo client
- Server source of truth: GraphQL resolver + `TokenUsageLedgerStore` + repository

Layering follows ownership: presentation cannot bypass the store to calculate totals, and the composable cannot bypass store provenance by inspecting raw maps.

## Migration / Refactor Sequence

1. Add a local store-owned team summary provenance model in `tokenUsageMeterStore.ts`, for example `teamSummarySources` or `teamSummaryHydrationState` keyed by root `teamRunId`.
2. Add a public store method such as `needsTeamRunSummaryHydration(teamRunId)` or `hasLedgerBackedTeamSummary(teamRunId)`.
3. Update `applyTokenUsageUpdated()`:
   - continue updating member run summary;
   - continue updating `teamSummaries[rootTeamRunId]`;
   - if no ledger-backed team summary exists, mark that team summary as provisional/live;
   - if ledger-backed already exists, preserve ledger-backed status after applying the live delta.
4. Update `fetchTeamRunSummary(teamRunId)`:
   - perform the existing network-only query;
   - normalize unit prices;
   - store result under the requested `teamRunId`;
   - mark the team summary ledger-backed.
5. Tighten `upsertSummary()`:
   - remove implicit member-summary seeding of `teamSummaries[rootTeamRunId]`; or
   - require an explicit option/subject when the caller intends a team aggregate write.
6. Update `useTokenUsageWorkspaceScope.hydrateTeamTotalSummary()` to use the store provenance guard instead of `getTeamSummary()` existence.
7. Add/adjust store tests:
   - live event with `root_team_run_id` creates a visible team summary but `needsTeamRunSummaryHydration(teamRunId)` remains true;
   - `fetchTeamRunSummary(teamRunId)` marks the summary ledger-backed;
   - live event after ledger fetch preserves ledger-backed readiness;
   - member summary upsert/fetch does not seed team aggregate cache.
8. Add/adjust Token panel test:
   - seed a partial live `solution_designer` team summary;
   - mock `fetchTeamRunSummary()` to return a larger full aggregate;
   - mount/select team Token tab;
   - assert the final `Team total` row uses the aggregate and does not change when focus switches to `code_reviewer`.
9. Run focused tests before handoff.

## Key Tradeoffs

- Source metadata over unconditional fetch:
  - Slightly more code, but avoids repeated network fetches and gives the store a clear invariant.
- No backend aggregation change:
  - Lower risk and matches evidence that server aggregate is correct.
- No frontend total summing:
  - Preserves server-owned accounting/pricing, even though summing visible rows would be visually simple.

## Risks

- Race with asynchronous server persistence: a network fetch may temporarily return a ledger snapshot that does not include the newest just-streamed event. The store should keep applying subsequent live events; implementation should avoid a write pattern that permanently disables live updates after fetch.
- Existing tests may have relied on `upsertSummary()` implicitly seeding `teamSummaries` from member summaries. Such tests should be updated because that behavior is the aliasing risk.
- Backend `runId` ambiguity for team aggregate summaries remains a residual API-shape issue. This design avoids depending on it.

## Guidance For Implementation

- Keep changes local to frontend store/composable/tests unless implementation discovers a contradictory backend response.
- Prefer explicit store methods over ad hoc composable conditions.
- Do not add aggregation math to `TeamTokenUsageSummary.vue`.
- Use the requested `teamRunId` as the map key for team aggregate cache and provenance.
- Preserve live event responsiveness: a ledger-backed team summary should still update when `TOKEN_USAGE_UPDATED` arrives.
- Focused tests to run:
  - `pnpm -C autobyteus-web test:nuxt --run stores/__tests__/tokenUsageMeterStore.spec.ts components/workspace/usage/__tests__/TokenUsageMeterPanel.spec.ts`
  - If script syntax differs in this workspace, use the existing Vitest invocation pattern for those two files.
