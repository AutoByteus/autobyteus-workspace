# Design Spec

## Current-State Read

The server already owns the correct durable lifecycle (BEH-001): each accepted token observation is enriched, folded serially per canonical agent run, saved to `token_usage_run_records`, and only then emitted as a transformed `TOKEN_USAGE_UPDATED` event. That transformed event already contains `run_summary_after_event`, a complete cumulative summary built from the persisted record. Existing GraphQL run/team/member queries read the same current records and return the complete Token Meter shape.

The frontend weakens that contract in two places:

1. `tokenUsageMeterStore.ts` discards `run_summary_after_event` and reconstructs standalone/member summaries by adding live deltas into process-local maps.
2. `useTokenUsageWorkspaceScope.ts` treats any map entry as proof that durable hydration is complete. A post-restart delta-created entry therefore suppresses the GraphQL fetch (BEH-002/BEH-003).

The team stream introduces a second boundary loss: `TeamAgentEventAdapter`, `TeamTokenUsageDetails`, the team websocket projector, and the strict shared team DTO omit the already-persisted cumulative summary. The screenshot's `runtime unknown` is a visible consequence because the top-level team delta contract also omits runtime.

The existing team-total fix (BEH-004) is directionally correct: it distinguishes partial live aggregate state from a record-backed GraphQL aggregate. It still mutates an already hydrated aggregate with live deltas, leaving a response/event race documented by the prior ticket. This design tightens that lifecycle without moving aggregate calculation into the client.

Constraints:

- The database, fold, pricing calculations, and GraphQL field meanings are correct and must remain unchanged.
- The focused member, not the team aggregate, remains the primary team Token Meter subject.
- `TokenUsageMeterPanel.vue` remains presentational and must not calculate prices or infer completeness.
- The team transport schema is strict, so the cumulative summary must be added as an exact coordinated contract.
- No compatibility path may keep delta-only individual summaries as an alternative normal behavior.

## Intended Change

Carry the persisted `run_summary_after_event` through standalone and team websocket paths, map it once into the frontend cumulative summary shape, and make the frontend run/member caches admit **record-backed cumulative summaries only**. Individual live deltas are no longer accumulated into lifetime-looking run/member summaries.

The Token Usage store becomes the owner of three explicit readiness rules:

- an agent-run entry exists only when backed by GraphQL or a successful persisted-event cumulative snapshot;
- a team-member entry exists only when backed by GraphQL or a successful persisted-event cumulative snapshot for the exact team/run identity;
- a team aggregate retains explicit `live_partial`, `refresh_required`, or `record_backed` state and converges through the existing GraphQL team aggregate query.

For run/member snapshot races, `usageReportCount` is the monotonic current-record generation already present in both GraphQL and `run_summary_after_event`. A lower/equal generation cannot replace a newer cached record-backed summary. For team totals, the store tracks a live generation/dirty marker: a GraphQL response marks the aggregate current only if no authoritative team event arrived after that request began; otherwise one coalesced follow-up fetch is required.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System/Contract | REQ-001, REQ-004; AC-001, AC-002, AC-009 | Accepted token observation; GraphQL summary request | Investigation: persistence transformer, accumulator, SQLite/GraphQL probes | Preserve current-record storage, writer, pricing, and GraphQL authority; expose the existing post-persist cumulative event snapshot | DS-001, DS-002, DS-003 |
| BEH-002 | User/System | REQ-001, REQ-002, REQ-003; AC-003, AC-005, AC-006 | Select/open standalone Token tab; standalone live event | Investigation BEH-002: live delta creates `runSummaries`, raw existence blocks fetch | Run cache accepts only record-backed cumulative summaries; absent/invalid cumulative event data leaves hydration required | DS-001, DS-002, DS-004 |
| BEH-003 | User/System | REQ-001–REQ-005; AC-004–AC-007 | Focus team member; team live event | Investigation BEH-003: team contract drops cumulative summary and member delta blocks fetch | Preserve exact team/member identity, carry cumulative snapshot, and admit only record-backed member entries | DS-001, DS-003, DS-004 |
| BEH-004 | User/System | REQ-003, REQ-005; AC-006, AC-007 | Team aggregate display during live activity | Prior team-total ticket and current provenance code | Preserve backend aggregate ownership; partial/stale aggregate state triggers a coalesced GraphQL refresh instead of blindly adding deltas to a hydrated total | DS-003, DS-005 |
| BEH-005 | User | REQ-004, REQ-006; AC-002, AC-005, AC-008 | Token Meter render | Panel is presentation-only and renders selected summary | Provide only display-ready individual summaries; keep hierarchy, status semantics, localization, accessibility, and responsive layout unchanged | DS-001–DS-005 |
| BEH-006 | System/Contract | REQ-003; AC-006 | Live/GraphQL interleaving and duplicate delivery | Event IDs deduplicate; individual ordering currently implicit | Record generation comparison prevents stale replacement/double application; aggregate dirty generation forces eventual record-backed refresh | DS-004, DS-005 |

## Relevant Supplemental Task Artifacts

None.

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix`
- Current design issue found: `Yes`
- Root cause classification: `Missing Invariant` with contributing `Shared Structure Looseness`
- Refactor needed now: `Yes`
- Evidence: Run/member maps currently accept two meanings—partial client accumulation and complete server summary—while the composable uses object existence as readiness. The server already creates a cumulative post-persist snapshot, but the frontend/team transport discards it. A prior adjacent fix proves provenance is required for team aggregates.
- Design response: Tighten individual caches so partial lifetime summaries are unrepresentable; carry the existing cumulative event snapshot through the transport; centralize admission, identity, generation, and aggregate refresh policy in the store.
- Refactor rationale: Merely changing two early-return guards would repair the common restart sequence but would retain ambiguous cache values and permit stale GraphQL/live races to lose or double count usage. The approved AC-006 requires deterministic convergence.
- Intentional deferrals and residual risk: Provider pricing changes, database changes, Settings > Token Statistics, and new visual design remain out of scope. Full cumulative snapshots increase websocket payload size modestly. If persistence fails and `run_summary_after_event` is null, the Token Meter intentionally retains/loads the last durable summary instead of presenting an unpersisted delta as lifetime usage.

## Terminology

- **Record-backed summary:** A complete cumulative run/member summary obtained either from a current-record GraphQL query or `run_summary_after_event` produced after successful persistence.
- **Provisional team aggregate:** A team-total value assembled only from authoritative events observed in the current frontend lifecycle before the backend aggregate is fetched.
- **Refresh-required team aggregate:** A previously record-backed team total that may be stale because a persisted member event arrived after its last stable aggregate request began.
- **Summary generation:** For a single current run record, `usageReportCount`. The fold increments it once with each accepted record-changing observation and leaves it unchanged for suppressed duplicates/snapshots.

## Design Reading Order

Follow DS-001 for reopen hydration, DS-002/DS-003 for live event return paths, DS-004 for individual snapshot precedence, and DS-005 for team aggregate convergence. File and dependency mappings then project those owners into the current repository.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Remove delta-only standalone/member lifetime-summary construction as a normal path.
- Remove raw summary-existence hydration guards.
- Remove the duplicate composable `memberSummaryByKey` cache.
- Remove the generic `upsertSummary` test/public seam and replace it with identity-specific record-backed admission methods.
- Replace the two-state team source name/shape with the final explicit team aggregate readiness model; do not keep alias helpers for old names.
- A null/malformed post-persist snapshot remains a current failure condition, not a legacy compatibility path: it is not admitted as a complete summary, and GraphQL remains the durable fallback.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume: SQLite `token_usage_run_records`, one cumulative row per canonical run; 1,295 populated rows observed in `/Users/normy/.autobyteus/server-data/db/production.db`.
- Relevant code-model, serialization, semantic, or physical-store change: Websocket serialization now retains an already-existing nested cumulative summary. No database or persisted-record model changes.
- Normal reader/writer behavior and representative evidence: Awaited serialized fold writes the record; GraphQL and `run_summary_after_event` read/build the same cumulative meaning. Direct database and GraphQL probes matched.
- Required semantics and invariants under direct use: Exact run/team identity, cumulative token/cost/pricing/model/runtime/prompt/context/report meaning, and idempotent fold semantics remain unchanged.
- Physical-store, privacy/security, disposal/rebuild, and operational constraints: Existing history is non-disposable; no rewrite, deletion, backup window, or rebuild is justified.
- Decision: `Directly Usable — No Migration`
- Decision rationale: Existing rows already have every required field and normal readers return the correct meaning. Migration adds I/O/corruption/rollout cost without addressing frontend readiness.
- Acceptance criteria or design constraints supported by this decision: AC-001, AC-002, AC-009; REQ-001, REQ-004.

### Migration Plan

N/A — no transformation is required.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001–BEH-005 | Selected run/team identity | Record-backed Token Meter display | `useTokenUsageWorkspaceScope` orchestration; store readiness | Restores durable history on reopen/focus |
| DS-002 | Return-Event | BEH-001, BEH-002, BEH-005, BEH-006 | Persisted standalone event | Record-backed run cache | Persistence transformer + Token Usage store | Replaces delta-only in-memory standalone behavior |
| DS-003 | Return-Event | BEH-001, BEH-003–BEH-006 | Persisted team-member event | Member cache plus aggregate refresh state | Team event transport + Token Usage store | Preserves the cumulative snapshot through the strict team boundary |
| DS-004 | Bounded Local | BEH-002, BEH-003, BEH-006 | Incoming record-backed run/member snapshot | Accepted/ignored cache write | Token Usage store | Resolves GraphQL/live ordering without duplicate/lost contributions |
| DS-005 | Bounded Local | BEH-004, BEH-006 | Team live event / aggregate response | Stable record-backed team total | Token Usage store + workspace hydration loop | Prevents a stale aggregate response or blind delta merge from becoming final |

## Primary Execution Spine(s)

- **DS-001:** Workspace selection -> `useTokenUsageWorkspaceScope` exact subject -> store readiness query -> network-only GraphQL summary -> server current-record store -> SQLite record(s) -> store record-backed admission -> panel/team table.
- **DS-002:** Runtime token observation -> enrichment/pricing -> awaited per-run persistence -> `run_summary_after_event` -> standalone websocket mapper -> frontend summary mapper -> store generation admission -> Token Meter.
- **DS-003:** Runtime token observation -> awaited per-run persistence -> team event adapter -> strict team websocket DTO with `run_summary_after_event` -> `TeamStreamingService` -> store member admission + team aggregate dirty/provisional transition -> focused Token Meter/team table.

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Selection asks the store whether the exact subject has a record-backed summary. Only absence triggers GraphQL. The returned summary is identity-validated and generation-admitted before display. | selection, subject identity, current record, cache entry | Workspace scope + Token Usage store | loading/error, network-only policy |
| DS-002 | The server persists first and emits its complete cumulative record projection. Frontend maps and admits that snapshot rather than re-adding the event delta. | observation, persisted record, cumulative snapshot, run entry | Persistence transformer + Token Usage store | DTO mapping, event deduplication |
| DS-003 | Team correlation must preserve the same cumulative member snapshot through camel/snake and strict-schema boundaries. The member entry updates exactly; the team total is marked partial/dirty for backend aggregate convergence. | member event, team identity, member snapshot, team aggregate state | Team transport + Token Usage store | strict schema, aggregate refresh scheduling |
| DS-004 | Identity is checked first. If a record-backed entry exists, higher `usageReportCount` replaces it and lower/equal generations are ignored. | exact subject, current generation, incoming generation | Token Usage store | malformed snapshot handling |
| DS-005 | A team event increments the aggregate live generation. A fetch captures that generation. Its response is current only if the generation is unchanged; otherwise one follow-up refresh is coalesced after the in-flight request. | team id, live generation, fetch generation, aggregate entry | Token Usage store + workspace scope | single-flight, continuous activity |

## Spine Actors / Main-Line Nodes

- `TokenUsageRunPersistenceTransformer` / `TokenUsageRunAccumulator`
- `TeamAgentEventAdapter` and `projectTeamAgentEventMessage`
- shared team stream DTO parser
- frontend token summary wire mapper
- `useTokenUsageMeterStore`
- `useTokenUsageWorkspaceScope`
- existing GraphQL token summary resolvers
- `TokenUsageMeterPanel` / `TeamTokenUsageSummary`

## Ownership Map

- **Server token current-record subsystem:** owns fold sequencing, persistence, cumulative meaning, pricing, and post-event cumulative snapshot construction.
- **Team event transport:** owns lossless, strict projection of the persisted member snapshot and exact execution identity; it must not recalculate usage.
- **Frontend wire mapper:** owns snake_case DTO validation/conversion to `TokenUsageRunSummary`; it must not apply cache policy.
- **Token Usage Pinia store:** owns accepted cache shapes, identity validation, event deduplication, record generation precedence, readiness, and team aggregate refresh generations.
- **Workspace scope composable:** owns selected/focused subject resolution, single-flight fetch orchestration, and loading/error state; it must not infer readiness from raw objects.
- **Components:** own rendering only.
- **GraphQL resolver/store:** remains a thin public read boundary over current records; it is not the frontend cache owner.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| GraphQL run/team/member queries | Server token current-record store | Public durable read boundary | Frontend readiness or presentation |
| `handleTokenUsageUpdated` | Token Usage store | Agent-stream dispatch adapter | Delta accumulation policy |
| `TeamStreamingService` token branch | Token Usage store | Team-stream dispatch adapter | Member summary conversion/precedence |
| `useTokenUsageWorkspaceScope` | Token Usage store for cache policy | UI subject and fetch orchestration | Summary source inference or pricing |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| Run/member `applyToSummary` delta accumulation | Produces incomplete lifetime-looking entries | Persisted cumulative event mapper + store record-backed admission | In This Change | Team provisional aggregate may retain a narrowly named delta fold |
| Raw `getRunSummary` / `getMemberSummary` hydration guards | Object existence does not prove completeness | Store `needsAgentRunSummaryHydration` / `needsTeamMemberSummaryHydration` | In This Change | Exact compound member identity required |
| `memberSummaryByKey` | Duplicates store state and weakens ownership | Store team-member entry | In This Change | Loading/error maps remain orchestration state |
| Generic `upsertSummary` | Does not express subject/source identity | Explicit record-backed run/member upserts | In This Change | Update tests; no alias retained |
| Parallel `teamSummarySources` loose metadata | Separates value from lifecycle state | Team aggregate cache entry with readiness state/generation | In This Change | Preserve requested-team keying |
| Blind live delta extension of a record-backed team aggregate | Can double count a GraphQL-included event | Refresh-required transition + stable-generation GraphQL refresh | In This Change | Partial pre-hydration aggregate may still fold persisted event deltas |

## Return Or Event Spine(s) (If Applicable)

- DS-002 and DS-003 are the return/event spines. The persistence transformer is the authority change: before it, the observation is not durable; after successful fold, `run_summary_after_event` is eligible to become a frontend record-backed summary.
- A null snapshot or `token_usage_persistence_unavailable` event never enters the record-backed run/member cache. Existing durable values remain visible; absence still triggers GraphQL.

## Bounded Local / Internal Spines (If Applicable)

- **DS-004 parent owner:** Token Usage store. `wire snapshot -> schema map -> exact identity check -> compare usageReportCount -> accept newer / ignore equal-or-older -> expose record-backed entry`.
- **DS-005 parent owner:** Token Usage store with workspace fetch orchestration. `persisted team event -> increment live generation -> partial-or-refresh-required state -> single-flight GraphQL request captures generation -> response admission -> stable current or coalesced follow-up`.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Event idempotency | DS-002, DS-003 | Token Usage store | Prevent duplicate event/team-delta application | Websocket replay/duplicate safety | Double count |
| DTO schema/conversion | DS-002, DS-003 | Transport/store boundary | Exact field and unit-price mapping | Snake/camel and strict contract | Silent field loss such as runtime/prices |
| Loading/error state | DS-001, DS-005 | Workspace scope | Truthful fetch lifecycle | UI feedback | Partial data presented as complete |
| Aggregate single-flight/coalescing | DS-005 | Workspace scope/store | Avoid parallel or endless redundant requests | Live activity can overlap fetch | Request storm or stale final total |
| Localization/accessibility/responsive rendering | DS-001 | Components | Preserve existing UI contract | User-visible quality | Scope drift if mixed with data ownership |
| Persistence quality flags | DS-002, DS-003 | Server/frontend admission | Distinguish failed persistence from record-backed event | Failure truthfulness | Unpersisted data mislabeled durable |

## Ownership Boundaries

The server current record is authoritative for cumulative usage. A websocket event may cross into record-backed frontend state only through its post-persist cumulative snapshot. The shared transport owns representation, not meaning. The frontend store owns cache admission and ordering, while the workspace composable owns when to invoke network reads. Components receive only approved display values and state flags.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `TokenUsageRunStore` GraphQL reads | repository/current-record aggregation | GraphQL resolvers | UI/database direct read | Extend summary query, not client pricing |
| team stream summary DTO schema | nested summary validation/serialization | team projector/frontend parser | `unknown`/unvalidated object spread | Extend exact DTO schema |
| Token Usage store admission methods | maps, readiness, generation, dedup | stream handlers and workspace scope | direct map writes/raw existence checks | Add identity-specific store method |
| workspace hydration methods | loading/error/single-flight | Token panel scope | component-owned fetch | Extend composable orchestration |

## Dependency Rules

- Server domain/persistence may not depend on frontend or presentation types.
- Team adapter/projector may depend on the server summary payload type but must only copy it.
- Shared contracts validate wire representation and may not import server business services.
- Frontend mapper may depend on the shared DTO schema and frontend summary type; it may not access Pinia state.
- Store may call GraphQL and mapper boundaries; it owns cache writes. Production callers and tests must not write raw maps.
- Workspace scope may call store readiness/fetch getters only; raw object presence is forbidden as a readiness predicate.
- Components may not import GraphQL, pricing metadata, wire DTOs, or store internals.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `run_summary_after_event` | persisted agent run | Full cumulative post-event snapshot | canonical `run_id`, optional exact root team id | Nullable only on failed/unavailable public persistence summary |
| `mapTokenUsageRunSummaryDto` | wire-to-frontend summary | Exact field conversion | expected run id; optional expected team id | Reject mismatch/malformed input |
| `upsertRecordBackedAgentRunSummary` | standalone run cache | Newer-generation admission | `{runId}` | No generic selector |
| `upsertRecordBackedTeamMemberSummary` | team member cache | Exact team/member admission | `{teamRunId, agentRunId}` | Requires matching summary root/run ids |
| `needsAgentRunSummaryHydration` | standalone readiness | True only when no record-backed entry | `{runId}` | Does not inspect arbitrary object truthiness |
| `needsTeamMemberSummaryHydration` | member readiness | Exact compound readiness | `{teamRunId, agentRunId}` | Prevents cross-team satisfaction |
| `fetchTeamRunSummary` | team aggregate | Current backend aggregate read with generation capture | `{teamRunId}` | Response may remain refresh-required |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Summary DTO mapper | Yes | Yes | Low | Require expected identity arguments |
| Run admission/readiness | Yes | Yes | Low | Separate from member/team methods |
| Member admission/readiness | Yes | Yes | Low | Compound identity mandatory |
| Team aggregate refresh | Yes | Yes | Low | Requested team id owns cache key |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Individual cache value | `recordBackedSummary` | Yes | Low | Do not call a delta-derived object a summary |
| Team lifecycle | `live_partial` / `refresh_required` / `record_backed` | Yes | Low | Replace `ledger_backed` terminology consistently |
| Member identity | `TeamTokenUsageMemberIdentity` | Yes | Low | Always carry both ids at boundaries |
| Generation | `usageReportCount` | Yes | Medium | Document single-run ordering use; do not use team aggregate count as member generation |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Durable cumulative source | Server current-record token usage | Reuse | Already correct and probed | N/A |
| Reopen/focus read | Existing GraphQL summary queries | Reuse | Network-only and field-complete | N/A |
| Team strict transport | `@autobyteus/team-stream-contracts` | Extend | Governs team websocket DTOs | N/A |
| Frontend cache/readiness | `tokenUsageMeterStore` | Extend/Refactor | Existing owner, missing invariant | N/A |
| UI orchestration | `useTokenUsageWorkspaceScope` | Extend/Refactor | Existing subject/fetch owner | N/A |
| Summary mapping | Agent-streaming transport adapters | Create focused mapper | Mapping is reused by standalone/team and does not belong in store arithmetic | Existing generic adapters have no full summary mapper |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| Server token usage | persistence and cumulative snapshot | DS-001–DS-003 | current-record store | Reuse | No calculations change |
| Team event streaming/contracts | lossless nested summary transport | DS-003 | team transport | Extend | Exact schema, no `unknown` |
| Web agent streaming | wire summary conversion | DS-002, DS-003 | Token Usage store | Extend | One mapper for both paths |
| Web Token Usage store | admission/readiness/generation/aggregate refresh | DS-001–DS-005 | frontend cache | Refactor | Governing frontend owner |
| Workspace Token scope | identity and fetch lifecycle | DS-001, DS-005 | Token tab | Refactor | Remove duplicate summary cache |
| Token Meter components | rendering | DS-001 | user surface | Reuse | No design/layout change |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-team-stream-contracts/src/token-usage-run-summary-dto.ts` | contracts | summary wire schema | Full exact nested schema/type | Reused by team parser and web mapper | Yes |
| `team-agent-message-dtos.ts` | contracts | team token event DTO | Add nullable nested summary | Existing message owner | Yes |
| `team-agent-event.ts` + adapter/projector | server team stream | domain-to-wire transport | Preserve post-event summary | Existing correlation/projection path | Yes |
| `autobyteus-web/services/agentStreaming/tokenUsageRunSummaryMapper.ts` | web streaming | wire mapper | DTO-to-domain conversion | Reused for standalone/team | Yes |
| `tokenUsageMeterStore.ts` | web token usage | governing cache | Admission, precedence, readiness, aggregate lifecycle | Cohesive state owner | Yes |
| `useTokenUsageWorkspaceScope.ts` | web workspace | fetch orchestration | Consume readiness; aggregate follow-up; remove duplicate cache | Existing UI scope owner | Yes |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Full snake_case run summary schema | `token-usage-run-summary-dto.ts` | shared transport contracts | Team validation and frontend standalone/team mapping need the same wire shape | Yes | Yes | Server business-domain owner |
| Wire-to-camel mapping | `tokenUsageRunSummaryMapper.ts` | web streaming | Both websocket routes consume same payload | Yes | Yes | Cache/readiness owner |
| Record-backed generation admission | private store helper | web Token Usage store | Run/member admission shares exact precedence rule | Yes | Yes | Generic identity-erasing public API |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `TokenUsageRunSummaryDto` | Yes | Yes | Low | Mirror canonical payload exactly and test all fields |
| Frontend `TokenUsageRunSummary` | Yes | Yes | Low | Keep camelCase UI/domain shape; conversion at boundary |
| Individual cache entry | Yes—record-backed only | Yes | Low | Do not store partial deltas |
| Team aggregate entry | Yes—summary plus explicit lifecycle/generation | Yes | Low | Keep source and value in same owned entry |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-team-stream-contracts/src/token-usage-run-summary-dto.ts` | Transport contracts | shared DTO | Exact cumulative wire schema/type | Single reusable transport definition | N/A |
| `autobyteus-team-stream-contracts/src/team-agent-message-dtos.ts` | Transport contracts | team event schema | Include `run_summary_after_event` | Message composition stays local | Yes |
| `autobyteus-team-stream-contracts/src/index.ts` | Transport contracts | package facade | Export summary DTO/schema | Existing facade | Yes |
| `autobyteus-server-ts/src/agent-team-execution/domain/team-agent-event.ts` | Team domain | correlated event | Type cumulative summary detail | Existing event owner | Server payload type |
| `.../services/team-agent-event-adapter.ts` | Team domain adapter | admission | Preserve/validate internal summary | Existing adapter | Server payload type |
| `.../services/agent-streaming/team-agent-event-websocket-projector.ts` | Team streaming | wire projector | Project nested summary | Existing projector | Shared contract parser |
| `autobyteus-web/types/tokenUsageMeter.ts` | Web token domain | types | Type nested event summary and final summaries | Existing type owner | Shared DTO type |
| `autobyteus-web/services/agentStreaming/tokenUsageRunSummaryMapper.ts` | Web streaming | adapter | Validate/map full summary | Reused by both live routes | Shared DTO schema |
| `autobyteus-web/stores/tokenUsageMeterStore.ts` | Web token usage | governing owner | Record-only individual caches; team lifecycle; generation precedence; GraphQL writes | One cohesive state owner | Mapper/domain type |
| `autobyteus-web/composables/useTokenUsageWorkspaceScope.ts` | Web workspace | orchestration | Readiness-driven run/member hydration; stable team refresh; no duplicate cache | Existing boundary | Store APIs |
| Focused contract/server/web tests | Respective subsystem | coverage | Contract preservation, mapping, race/readiness regressions | Near owning behavior | Fixtures |

## Applied Patterns (If Any)

- **Snapshot-over-delta convergence:** reuse the server's post-persist cumulative snapshot for individual subjects.
- **Monotonic generation admission:** compare single-run `usageReportCount` to reject stale/equal snapshots.
- **Dirty generation / single-flight refresh:** coalesce team aggregate refetches until one response spans a quiet generation.
- **Structural invariant:** individual cache maps cannot contain provisional lifetime summaries.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-team-stream-contracts/src/token-usage-run-summary-dto.ts` | File (new) | shared transport schema | Zod schema/type for nested cumulative summary including unit prices | Transport contract is reused across team parse and web adapter | Pricing calculation/cache logic |
| `autobyteus-team-stream-contracts/dist/*` | Generated files | package build output | Rebuilt JS/types/maps for changed contract | Repository tracks dist | Hand-written divergence |
| `autobyteus-server-ts/src/agent-team-execution/domain/team-agent-event.ts` | File | team correlated domain event | Carry summary typed from server domain | Same event boundary | Frontend types |
| `autobyteus-server-ts/src/agent-team-execution/services/team-agent-event-adapter.ts` | File | team admission adapter | Copy nullable post-persist summary | Existing raw-to-domain boundary | Cumulative recomputation |
| `autobyteus-server-ts/src/services/agent-streaming/team-agent-event-websocket-projector.ts` | File | team transport projector | Emit strict nested DTO | Existing domain-to-wire boundary | Store queries |
| `autobyteus-web/services/agentStreaming/tokenUsageRunSummaryMapper.ts` | File (new) | web transport adapter | Exact snake-to-camel mapping | Both stream paths need one adapter | Pinia state/fetching |
| `autobyteus-web/stores/tokenUsageMeterStore.ts` | File | cache owner | All readiness/admission/order/aggregate rules | Existing capability owner | UI messages/components |
| `autobyteus-web/composables/useTokenUsageWorkspaceScope.ts` | File | UI orchestration | Exact subjects and single-flight hydration | Existing Token-tab scope | Duplicate summary values |
| `autobyteus-web/components/workspace/usage/TokenUsageMeterPanel.vue` | File | presentation | No expected structural change; verify state behavior | Existing renderer | Data-source inference |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-team-stream-contracts/src` | Transport | Yes | Low | DTO/schema only |
| `autobyteus-server-ts/src/agent-team-execution` | Main-Line Domain-Control | Yes | Low | Correlation/admission only |
| `autobyteus-server-ts/src/services/agent-streaming` | Transport | Yes | Low | Wire projection only |
| `autobyteus-web/services/agentStreaming` | Transport | Yes | Low | DTO adapter is appropriate |
| `autobyteus-web/stores` | Main-Line Domain-Control | Yes | Low | Frontend cache lifecycle owner |
| `autobyteus-web/composables` | Mixed Justified | Yes | Low | UI selection + async orchestration, not data truth |

## Concrete Examples / Shape Guidance

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Individual live update | persisted event snapshot count 200 replaces cached count 199 | add event delta to an empty post-restart summary | Shows why snapshot is authoritative |
| Race | GraphQL count 199 arrives after live snapshot 200 -> ignore 199 | unconditional GraphQL replacement or replay delta onto 199 | Prevents loss/double count |
| Missing snapshot | keep/no run entry, `needs...Hydration=true`, fetch GraphQL | create zero/null lifetime summary | Keeps failure truthful |
| Team member identity | `{teamRunId, agentRunId}` and summary must match both | key/readiness by display name or raw object existence | Prevents cross-subject satisfaction |
| Team aggregate | event marks generation dirty; stable follow-up GraphQL becomes current | add every live delta to possibly inclusive GraphQL total | Preserves backend aggregate authority |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Accept events without `run_summary_after_event` as normal run/member deltas | Would support mixed old/new server-client versions | Rejected | Coordinated package/server/web change; null means failure and triggers durable hydration |
| Keep generic `upsertSummary` alias | Reduces test edits | Rejected | Replace call sites with identity/source-specific admission |
| Keep raw existence checks plus new source flags | Small diff | Rejected | Store readiness APIs are the only predicates |
| Client-sum team total from member snapshots | Avoids aggregate refetch | Rejected | Preserve backend GraphQL aggregate ownership |
| Add a second client persistence layer | Could survive restart locally | Rejected | Existing SQLite/GraphQL authority is directly usable |

## Derived Layering (If Useful)

`Server current-record domain -> websocket/GraphQL transport -> frontend transport mapper -> Token Usage cache owner -> workspace orchestration -> presentation`.

The same cumulative meaning crosses transports, but each layer owns only its representation or lifecycle responsibility.

## Change / Refactor Sequence

1. Add the exact shared cumulative summary DTO/schema and export it; rebuild tracked contract dist output.
2. Extend server team event details, adapter, and websocket projector to preserve `run_summary_after_event`; add contract/projection tests before frontend consumption changes.
3. Add the frontend wire summary mapper and type the standalone/team nested field.
4. Refactor the store:
   - admit only record-backed run/member summaries;
   - replace generic upserts and raw maps/source metadata with explicit entry APIs;
   - use `usageReportCount` precedence;
   - retain event-id deduplication;
   - model team aggregate `live_partial` / `refresh_required` / `record_backed` plus live/fetch generation.
5. Refactor workspace hydration to use store readiness, remove `memberSummaryByKey`, and coalesce follow-up team aggregate fetches until stable.
6. Remove obsolete delta-only individual fold paths, raw-existence guards, generic upsert API, and old team source helpers/names.
7. Add focused store/component/transport regressions for restart, full field mapping, identity mismatch, missing snapshot, stale/equal/newer generations, and team dirty-fetch ordering.
8. Run shared-contract build/tests, server focused tests/typecheck, web focused tests/typecheck/build guards, and leave API/E2E coverage decisions to `api_e2e_engineer` after code review.
9. Delivery updates long-lived Token Meter docs to state that individual live summaries are post-persist cumulative snapshots and team totals use stable-generation GraphQL convergence.

## Key Tradeoffs

- **Chosen:** carry the full existing cumulative summary. It costs more websocket bytes but removes ambiguous client arithmetic, restores every field including runtime/unit prices, and gives deterministic generation comparison.
- **Rejected:** frontend provenance flags plus unconditional GraphQL replacement. Smaller diff, but cannot resolve an in-flight response that is older than a just-delivered event.
- **Chosen:** backend aggregate refetch for dirty team totals. It preserves aggregate ownership and correctness at the cost of coalesced network reads during live activity.
- **Chosen:** hide/unadmit unpersisted individual deltas. The Token Meter promises server-accounted data; displaying a persistence-failed delta as lifetime usage would be misleading.

## Risks

- The shared summary schema is large; omission of one nested field could recreate fidelity drift. Contract and mapper fixtures must cover every field, especially unit prices, runtime, prompt/context, and costs.
- Team aggregate refreshes could become chatty during frequent events. Enforce one in-flight request per team and a single dirty follow-up rather than parallel fetches; debounce only if it does not weaken final convergence.
- `usageReportCount` is an individual current-record generation. Do not use the team aggregate's summed count to order a member cache.
- Team event identity mismatches must fail admission and leave hydration required; do not “repair” roots client-side.
- Worktree dependencies are currently absent; implementation must provision them in the ticket worktree before claiming checks.

## Guidance For Implementation

- Keep the server's `TokenUsageRunSummaryPayload` canonical. The shared DTO mirrors transport shape; do not move pricing or aggregation into the contract package.
- Parse/map `run_summary_after_event` at one frontend boundary. Do not duplicate snake-to-camel mapping in standalone and team handlers.
- Validate all numeric fields as finite and identities as nonblank. Preserve nullable cost/status semantics exactly.
- In store admission, compare generations only after exact identity validation. Accept higher, ignore equal/lower. A skipped version is safe because the snapshot is cumulative.
- For team aggregate fetch, capture the live generation before the request. A response with a changed generation may be displayed as stale/refreshing but must not mark readiness complete; schedule one coalesced follow-up.
- Keep `TokenUsageMeterPanel.vue` unchanged unless a minimal existing-state binding is required. Do not add client pricing, a new badge, or redesign.
- Tests should reproduce the user's sequence: fresh store, two zero/null delta events whose cumulative post-persist snapshot/GraphQL fixture is populated, then Token-tab mount. The final view must show the record-backed lifetime values and full price/runtime metadata.
