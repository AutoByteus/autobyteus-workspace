# Design Spec

## Current-State Read

The current Memory page is a run-first memory viewer.

Current frontend path:

`autobyteus-web/pages/memory.vue -> MemoryIndexPanel.vue -> agent/team flat index stores -> GraphQL flat index queries -> MemoryInspector.vue -> agent/team view stores -> GraphQL memory view queries`

Current backend path:

- Standalone agent index: `MemoryIndexResolver.listRunMemorySnapshots -> AgentMemoryIndexService.listSnapshots -> MemoryFileStore`.
- Team index: `MemoryIndexResolver.listTeamRunMemorySnapshots -> TeamMemoryIndexService.listTeamSnapshots -> TeamRunMetadataStore + MemoryFileStore`.
- Standalone memory view: `MemoryViewResolver.getRunMemoryView -> AgentMemoryService.getRunMemoryView -> MemoryFileStore`.
- Team member memory view: `MemoryViewResolver.getTeamMemberRunMemoryView -> TeamMemberMemoryLayout + AgentMemoryService.getRunMemoryView`.

Current ownership and coupling problems:

- The backend index API exposes storage snapshots (`runId`) as the primary navigation unit. It does not answer the user's first question: "which agents or agent teams have memory?"
- The team index API can read team metadata, but still groups and paginates by team run, so users must scan repeated team-run rows before choosing the team they care about.
- `MemoryIndexPanel.vue` owns too many responsibilities: scope switching, search, manual run ID lookup, flat agent run rendering, flat team run rendering, team-run expansion, member selection, pagination, and cross-store reset behavior.
- `agentMemoryViewStore.ts` and `teamMemoryViewStore.ts` duplicate inspector payload state, raw-trace limits, raw-trace inclusion, loading, and error handling.
- `MemoryInspector.vue` infers the active identity from global scope and separate stores instead of receiving or reading one explicit inspect target.

Constraints the target design must respect:

- Memory payload files remain in the existing storage layout: `memory/agents/<runId>/...` and `memory/agent_teams/<teamRunId>/<memberRunId>/...`.
- Existing payload readers remain authoritative for Working Context, Episodic, Semantic, and Raw Traces.
- Run-history, team-run metadata, and optional definition records may enrich labels/summaries, but do not decide inclusion by themselves.
- Legacy standalone memory directories without usable history/metadata must remain visible as inspectable memory.
- The Memory page should match the existing Agents and Agent Teams pages' query-driven navigation style rather than requiring a full router restructure.

## Intended Change

Replace the flat run-list Memory page with a backend-for-frontend-supported, page-based Memory browser:

1. **Memory Home** lists only independent **Agents with Memory** or **Agent Teams with Memory**.
2. Selecting an agent opens **Agent Memory Detail**, listing only that agent's memory-bearing runs.
3. Selecting an agent run opens **Memory Inspector** for that run.
4. Selecting an agent team opens **Agent Team Memory Detail**, listing only that team's memory-bearing team runs.
5. Selecting a member inside a team run opens **Memory Inspector** for that team member's memory in that team run.

The first list is a memory-derived catalog. If 100 agents are configured but only 5 have stored memory, Memory Home lists only those 5 agents. If 100 agent teams are configured but only 5 have memory-bearing team runs/member memories, Memory Home lists only those 5 teams. Definition metadata improves display names and cards only after stored memory proves inclusion.

The frontend must consume backend read models shaped for this navigation. It must not fetch an unbounded flat run snapshot list and rebuild the hierarchy locally, and it must not use the Agents/Agent Teams definition catalogs as the source of Memory Home.

Canonical user-facing labels:

- `Agents with Memory`
- `Agent Teams with Memory`
- `Agent Memory Detail`
- `Agent Team Memory Detail`
- `Agent Runs`
- `Team Runs`
- `Team member memories`
- `Memory Inspector`
- `Unattributed runs`

Do not use `Memory Subjects` or similarly abstract labels in the UI.

The page-flow text prototype is part of this design package:

`/Users/normy/autobyteus_org/autobyteus-worktrees/memory-inspector-ux-redesign/ui-prototypes/memory-inspector-ux-redesign/page-text-prototype.md`

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Larger Requirement / Behavior Change.
- Current design issue found (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue plus File Placement Or Responsibility Drift.
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes.
- Evidence:
  - `AgentMemoryIndexService` exposes only run IDs and file flags, so the backend boundary cannot answer “which agents have memory?”
  - `TeamMemoryIndexService` can read team metadata, but still returns team-run pages, so it cannot answer “which teams have memory?” at the primary navigation level.
  - `MemoryIndexPanel.vue` mixes all navigation levels and both standalone/team identity models.
  - Local memory data contains hundreds of run directories and repeated team runs, which makes flat run browsing materially hard.
- Design response:
  - Introduce Memory Explorer backend read-model owners for the agent-first and team-first Memory experience.
  - Split the frontend into Memory Home, agent detail, team detail, and inspector components/stores.
  - Replace flat index queries with explicit BFF queries for agents-with-memory, agent runs, teams-with-memory, and team runs/member targets.
- Refactor rationale: Adding the new UX inside `MemoryIndexPanel.vue` and the current flat index APIs would preserve the wrong boundary and deepen responsibility drift.
- Intentional deferrals and residual risk, if any: Persistent indexing/cache is deferred. Current local scale supports scan/enrichment with pagination. If future profiling shows unacceptable latency, add a cache inside the Memory Explorer services without changing UI identity shapes.

## Terminology

- `Subsystem` / `capability area`: a larger functional area that owns a broader category of work and may contain multiple files plus optional module groupings.
- `Module`: an optional intermediate grouping inside a subsystem when the codebase benefits from it. Do not use `module` as a synonym for one file or as the default ownership term.
- `Folder` / `directory`: a physical grouping used to organize files and any optional module groupings.
- `File`: one concrete source file and the primary unit where one concrete concern should land.
- `Agent with memory`: an independent agent represented in Memory Home because at least one inspectable memory run exists for it. The agent is grouped by `agentDefinitionId` when metadata exists.
- `Agent team with memory`: an agent team represented in Memory Home because at least one inspectable team run/member memory exists for it. The team is grouped by `teamDefinitionId`.
- `Unattributed runs`: standalone memory run directories that are inspectable but cannot be attributed to an agent definition from available metadata.
- `Memory inspect target`: the exact run-level identity the inspector can load. Standalone targets use `runId`; team member targets use `teamRunId + memberRunId`.

## Design Reading Order

Read and write this design from abstract to concrete:

1. data-flow spine
2. subsystem / capability-area allocation
3. draft file responsibilities -> extract reusable owned structures -> finalize file responsibilities
4. folder/path mapping

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove the current flat run-list primary UI and replace flat index queries/stores/tests with agent/team-first equivalents.
- Obsolete in-scope paths:
  - `MemoryIndexPanel.vue` as the all-in-one flat run panel.
  - `agentMemoryIndexStore.ts`, `teamMemoryIndexStore.ts`, and `memoryScopeStore.ts` as current flat-index navigation owners.
  - Separate scope-specific inspector payload stores if a unified `MemoryInspectorStore` can fully replace them.
  - Frontend GraphQL documents for `listRunMemorySnapshots` and `listTeamRunMemorySnapshots`.
  - Backend GraphQL flat index queries `listRunMemorySnapshots` and `listTeamRunMemorySnapshots`, unless implementation discovers an external consumer; if so, route a requirement gap instead of silently keeping a dual primary API.
- Treat removal as first-class design work: update generated GraphQL/types, localization, and tests so no hidden flat primary path remains.
- Decision rule: the design must not keep a second flat run browser beside the agent/team-first Memory browser.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-MEM-001 | Primary End-to-End | Memory page opens in agents tab | Agent cards for agents with memory render | `AgentMemoryExplorerService` | Main entry path for independent agent memory. |
| DS-MEM-002 | Primary End-to-End | User opens one agent's memory | Runs for that agent render | `AgentMemoryExplorerService` | Ensures selected-agent filtering is backend-owned. |
| DS-MEM-003 | Primary End-to-End | User selects an agent run | Inspector tabs render run memory | `MemoryInspectorStore` + `AgentMemoryService` | Exact standalone memory inspection path. |
| DS-MEM-004 | Primary End-to-End | Memory page opens/switches to teams tab | Team cards for teams with memory render | `TeamMemoryExplorerService` | Main entry path for team memory. |
| DS-MEM-005 | Primary End-to-End | User opens one team's memory | Team runs and member memory buttons render | `TeamMemoryExplorerService` | Ensures selected-team filtering and member targets are backend-owned. |
| DS-MEM-006 | Primary End-to-End | User selects a member inside a team run | Inspector tabs render member memory | `MemoryInspectorStore` + `AgentMemoryService` | Exact team member memory inspection path. |
| DS-MEM-007 | Bounded Local | Navigation query changes | Incompatible selection/list state is reset | `MemoryExplorerStore` | Prevents stale run/member selections after scope or card changes. |
| DS-MEM-008 | Bounded Local | Inspector tab changes to Raw Traces or trace limit changes | Payload refetch includes raw traces | `MemoryInspectorStore` | Keeps Raw Traces lazy-loaded. |

## Primary Execution Spine(s)

- Agent home browse: `Memory page -> MemoryExplorerStore -> listAgentsWithMemory GraphQL -> AgentMemoryExplorerService -> MemoryFileStore + run-history enrichment -> AgentWithMemorySummary cards`.
- Agent detail browse: `Agent card -> MemoryExplorerStore -> listAgentRunsWithMemory GraphQL -> AgentMemoryExplorerService -> AgentRunMemorySummary cards`.
- Agent run inspect: `Agent run card -> MemoryInspectorStore -> getAgentRunMemoryView GraphQL -> AgentMemoryService -> MemoryFileStore -> MemoryInspector tabs`.
- Team home browse: `Memory page -> MemoryExplorerStore -> listAgentTeamsWithMemory GraphQL -> TeamMemoryExplorerService -> TeamRunMetadataStore + MemoryFileStore + history enrichment -> AgentTeamWithMemorySummary cards`.
- Team detail browse: `Team card -> MemoryExplorerStore -> listAgentTeamRunsWithMemory GraphQL -> TeamMemoryExplorerService -> AgentTeamRunMemorySummary cards with TeamMemberMemoryTargetSummary buttons`.
- Team member inspect: `Team member button -> MemoryInspectorStore -> getTeamMemberRunMemoryView GraphQL -> TeamMemberMemoryLayout + AgentMemoryService -> MemoryInspector tabs`.

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-MEM-001 | On Memory Home, the frontend asks the backend for independent agents that have inspectable memory. The backend starts from memory evidence, groups attributed runs by agent definition, creates an `Unattributed runs` fallback when needed, enriches labels from metadata, and returns paged cards. | `MemoryPage`, `MemoryExplorerStore`, `MemoryExplorerResolver`, `AgentMemoryExplorerService`, `MemoryFileStore` | `AgentMemoryExplorerService` | Run-history enrichment, display-name fallback, latest timestamp aggregation, search, pagination. |
| DS-MEM-002 | After an agent card is selected, the frontend requests runs for that selected agent or for the unattributed fallback. The backend applies the explicit selector and returns only matching memory-bearing runs. | `AgentMemoryDetail`, `MemoryExplorerStore`, `AgentMemoryExplorerService`, `AgentRunMemorySummary` | `AgentMemoryExplorerService` | Run search, sorting, workspace/summary enrichment. |
| DS-MEM-003 | Selecting an agent run creates a standalone inspect target. The inspector store requests memory sections, initially without raw traces unless that tab is active. | `AgentRunMemoryInspector`, `MemoryInspectorStore`, `MemoryViewResolver`, `AgentMemoryService`, `MemoryFileStore` | `MemoryInspectorStore` for UI state; `AgentMemoryService` for payload reads | Raw trace limit, tab state, error handling. |
| DS-MEM-004 | In the teams tab, the frontend asks for agent teams that have stored team/member memory. The backend starts from team memory evidence, groups by team definition, enriches labels, and returns paged team cards. | `MemoryPage`, `MemoryExplorerStore`, `MemoryExplorerResolver`, `TeamMemoryExplorerService`, `TeamRunMetadataStore` | `TeamMemoryExplorerService` | Team history summary, member count, latest timestamp aggregation, search, pagination. |
| DS-MEM-005 | After a team card is selected, the frontend requests team runs for that team. Each returned team run includes only member memory targets that are inspectable. | `AgentTeamMemoryDetail`, `MemoryExplorerStore`, `TeamMemoryExplorerService`, `AgentTeamRunMemorySummary` | `TeamMemoryExplorerService` | Member display names, member memory flags, run search, sorting. |
| DS-MEM-006 | Selecting a member inside a team run creates a compound inspect target. The inspector reads `teamRunId + memberRunId` and keeps breadcrumbs tied to the team, team run, and member. | `TeamMemberMemoryInspector`, `MemoryInspectorStore`, `MemoryViewResolver`, `TeamMemberMemoryLayout`, `AgentMemoryService` | `MemoryInspectorStore` for UI state; `AgentMemoryService` for payload reads | Breadcrumb metadata, raw trace lazy loading. |
| DS-MEM-007 | Route/query changes and card selections drive a small navigation state machine. Scope changes clear selected agent/team/run/member state; card changes clear lower-level selections; inspector target changes cancel stale responses. | `MemoryExplorerStore` | `MemoryExplorerStore` | Request tokens, state reset policy, URL query sync. |
| DS-MEM-008 | Raw Traces are not loaded during the initial inspector fetch. Opening Raw Traces or applying a new limit triggers a targeted refetch that includes traces. | `MemoryInspectorStore` | `MemoryInspectorStore` | Tab state, trace limit validation, stale response protection. |

## Spine Actors / Main-Line Nodes

- `MemoryPage` (`autobyteus-web/pages/memory.vue`): query-driven page shell analogous to `agents.vue` / `agent-teams.vue`.
- `MemoryHome`: Memory Home view with tabs and cards for Agents with Memory / Agent Teams with Memory.
- `AgentMemoryDetail`: selected-agent detail view with run cards.
- `AgentTeamMemoryDetail`: selected-team detail view with team-run cards and member memory buttons.
- `MemoryInspector`: tabbed payload viewer for one explicit inspect target.
- `MemoryExplorerStore`: frontend navigation/list state owner.
- `MemoryInspectorStore`: frontend inspector payload/raw-trace state owner.
- `MemoryExplorerResolver`: GraphQL transport boundary for BFF list/read-model queries.
- `AgentMemoryExplorerService`: backend owner for independent agents with memory and their runs.
- `TeamMemoryExplorerService`: backend owner for agent teams with memory, team runs, and member memory targets.
- `AgentMemoryService`: existing backend owner for memory payload reads.
- `MemoryFileStore`: existing file IO boundary.

## Ownership Map

| Node | Owns | Must Not Own |
| --- | --- | --- |
| `MemoryPage` | Query-driven view selection, top-level layout, invalid-view fallback. | Memory grouping, file IO, GraphQL response shaping. |
| `MemoryHome` | Presentation of tabs, search, cards, loading/empty/error states. | Fetch policy beyond dispatching store actions. |
| `AgentMemoryDetail` | Presentation of one agent's runs and breadcrumb/back action. | Grouping all runs by agent; that belongs to backend. |
| `AgentTeamMemoryDetail` | Presentation of one team's runs and member memory buttons. | Deciding which team runs or members have memory; that belongs to backend. |
| `MemoryInspector` | Rendering memory tabs from one inspect target. | Scope inference from unrelated stores or direct file/API selection logic. |
| `MemoryExplorerStore` | Navigation state, search/page state, stale response handling, query-to-state mapping. | Memory payload content loading. |
| `MemoryInspectorStore` | Inspect target, payload sections, active tab, raw trace limit, raw trace lazy-load policy. | Agent/team card catalog or run-list pagination. |
| `MemoryExplorerResolver` | GraphQL input/output mapping and authorization/session context if applicable. | Memory grouping/enrichment policy. |
| `AgentMemoryExplorerService` | Memory-derived independent agent grouping, run filtering, metadata enrichment, `Unattributed runs` fallback. | Memory payload section parsing beyond summary flags. |
| `TeamMemoryExplorerService` | Memory-derived team grouping, team-run filtering, member target summaries, metadata enrichment. | Standalone agent grouping or payload tab parsing. |
| `AgentMemoryService` | Existing memory payload reads for standalone and team-member layouts. | Home/detail catalog grouping. |
| `MemoryFileStore` | Memory file/directory IO, file mtime/exists/read operations. | Agent/team definition lookup, UI labels, BFF pagination. |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `MemoryExplorerResolver` | `AgentMemoryExplorerService`, `TeamMemoryExplorerService` | GraphQL transport boundary for BFF read models. | Grouping, attribution fallback, display enrichment rules. |
| `MemoryViewResolver` | `AgentMemoryService` | Existing GraphQL transport boundary for payload reads. | Explorer navigation state or card summaries. |
| `autobyteus-web/graphql/queries/*` | Pinia stores | Operation document boundary for Apollo/generated types. | UI state or response normalization policy. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| `MemoryIndexPanel.vue` | Monolithic flat run browser no longer matches product flow. | `MemoryHome.vue`, `AgentMemoryDetail.vue`, `AgentTeamMemoryDetail.vue`, shared card/list components. | In This Change | Do not keep it as an alternate mode. |
| `agentMemoryIndexStore.ts` | Flat standalone run index state is replaced by agent-first navigation. | `memoryExplorerStore.ts`. | In This Change | Migrate tests to new store. |
| `teamMemoryIndexStore.ts` | Flat team-run index and expansion state are replaced by team-first navigation. | `memoryExplorerStore.ts`. | In This Change | Member target summaries come from backend. |
| `memoryScopeStore.ts` | Scope-only store is too thin once navigation is page/query driven. | `memoryExplorerStore.ts` plus route query state. | In This Change | Remove if no remaining consumer. |
| `agentMemoryViewStore.ts` / `teamMemoryViewStore.ts` | Duplicate raw trace and selected payload state. | `memoryInspectorStore.ts` with `MemoryInspectTarget`. | In This Change | Keep only if implementation proves consolidation unsafe; otherwise remove. |
| Flat GraphQL index operations | Primary UI no longer browses flat run snapshots. | `listAgentsWithMemory`, `listAgentRunsWithMemory`, `listAgentTeamsWithMemory`, `listAgentTeamRunsWithMemory`. | In This Change | If external consumers are discovered, route requirement gap. |
| Manual run-id primary form | The main UX is card/detail/inspector. | Search within Memory Home/detail plus `Unattributed runs`. | In This Change | A future advanced direct lookup can be separately requested. |
| Flat index tests | They assert legacy behavior. | BFF inclusion/exclusion and page-flow tests. | In This Change | Do not preserve old behavior as compatibility coverage. |

## Return Or Event Spine(s) (If Applicable)

- GraphQL return flow: `Explorer service -> Resolver DTO mapping -> Apollo generated result -> MemoryExplorerStore -> component cards`.
- Inspector payload return flow: `AgentMemoryService -> MemoryViewResolver -> MemoryInspectorStore -> MemoryInspector tabs`.
- Error return flow: backend resolver errors become store-level error states; components render a localized retry message without changing selected page/query state.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `MemoryExplorerStore`.
  - Chain: `route query/current action -> validate view + identity -> clear incompatible lower-level state -> fetch relevant list -> ignore stale response if selection changed`.
  - Why it matters: users can switch tabs/cards quickly; stale responses must not render wrong runs under a new agent/team.
- Parent owner: `MemoryInspectorStore`.
  - Chain: `set target -> fetch payload without raw traces -> active tab changes to Raw Traces -> refetch with limit -> update payload if target unchanged`.
  - Why it matters: Raw Traces can be large and must remain lazy-loaded.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Memory availability summary | DS-MEM-001..006 | Explorer services | Build flags for Working/Episodic/Semantic/Raw Traces and latest mtime. | Shared summary logic across standalone and team memory. | Duplicated file-name checks in services/resolvers. |
| Metadata enrichment | DS-MEM-001, DS-MEM-002, DS-MEM-004, DS-MEM-005 | Explorer services | Add display names, summaries, workspaces, status, timestamps from run history/team metadata. | Cards need readable labels without making metadata authoritative. | Memory inclusion accidentally depends on definitions/history only. |
| Unattributed fallback | DS-MEM-001, DS-MEM-002 | `AgentMemoryExplorerService` | Preserve inspectable standalone memory dirs lacking metadata. | Local data shows many such dirs. | Legacy memory disappears or is misassigned. |
| Pagination/search | DS-MEM-001, DS-MEM-002, DS-MEM-004, DS-MEM-005 | Explorer services and store | Apply search and page windows at the correct level. | Home search and detail search have different scopes. | Components reconstruct lists locally and drift from backend. |
| Breadcrumb display metadata | DS-MEM-003, DS-MEM-006 | `MemoryInspectorStore` | Preserve selected agent/team/run/member labels for inspector headers. | Inspector needs direct context. | Inspector falls back to raw IDs only. |
| Localization labels | UI spines | Memory components | Add direct labels and empty/error states. | Localization/audit guards require registered strings. | Hard-coded UI strings fail guard or produce inconsistent naming. |
| GraphQL type generation | All API spines | Frontend GraphQL boundary | Regenerate/update operation types after schema changes. | Stores/components need typed BFF results. | Manual types drift from schema. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Memory payload reads | `agent-memory` (`AgentMemoryService`, `MemoryFileStore`) | Reuse | Existing readers already load all memory sections. | N/A |
| Memory availability flags | `agent-memory` index services | Extend/refactor | Existing flat index services already inspect memory files. | N/A |
| Agent run metadata | `run-history` stores/services | Reuse as enrichment | Provides agent definition ID, names, summaries, workspaces, timestamps. | N/A |
| Team metadata/member roster | `run-history` team metadata services | Reuse as enrichment | Provides team definition ID and leaf member identities. | N/A |
| BFF agent/team Memory catalog | Current flat memory index APIs | Create new explorer boundary under `agent-memory` | The current APIs expose runs/team runs first and do not own the new grouping. | Flat index services have the wrong public contract. |
| Frontend route/view pattern | `agents.vue`, `agent-teams.vue` | Reuse pattern | Query-driven views match user expectation and existing app style. | N/A |
| Frontend Memory state | Current memory stores | Replace/refactor | Current stores mirror the flat API and duplicate inspector logic. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Backend `agent-memory` | Memory file IO, payload reads, explorer BFF read models. | All backend spines | `AgentMemoryExplorerService`, `TeamMemoryExplorerService`, `AgentMemoryService` | Extend | Keep memory authority here. |
| Backend `run-history` | Agent/team metadata, summaries, workspace/status enrichment. | DS-MEM-001,002,004,005 | Explorer services | Reuse | Enrichment only; no memory inclusion authority. |
| Backend GraphQL API | BFF query transport and payload view query transport. | All API spines | Resolvers | Extend/refactor | Add explicit agent/team Memory queries. |
| Frontend Memory feature | Page views, stores, components, GraphQL documents. | All UI spines | `MemoryExplorerStore`, `MemoryInspectorStore` | Refactor/create | Replace flat panel with page-based views. |
| Localization/i18n | Direct Memory labels and empty/error states. | UI spines | Components | Extend | Must include approved naming. |
| Tests | Backend unit/E2E, frontend store/component/page tests. | All spines | Validation owners | Replace/extend | Tests must verify memory-derived inclusion/exclusion. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-memory/domain/models.ts` | Backend memory | Memory domain DTOs | Add explorer summary DTOs and inspect target DTOs. | Existing home for memory domain models. | Yes |
| `autobyteus-server-ts/src/agent-memory/services/memory-run-summary-builder.ts` | Backend memory | Memory availability builder | Build flags/latest timestamps from memory directories. | Shared by agent/team explorer services. | Yes |
| `autobyteus-server-ts/src/agent-memory/services/agent-memory-explorer-service.ts` | Backend memory | Agent explorer read model | List agents with memory and selected-agent runs. | Standalone agent logic is distinct. | Yes |
| `autobyteus-server-ts/src/agent-memory/services/team-memory-explorer-service.ts` | Backend memory | Team explorer read model | List teams with memory, team runs, and member memory targets. | Team identity/member logic is distinct. | Yes |
| `autobyteus-server-ts/src/api/graphql/types/memory-explorer.ts` | Backend GraphQL | Explorer transport | GraphQL input/output types and queries for BFF lists. | Keeps explorer schema together. | Yes |
| `autobyteus-web/graphql/queries/memoryExplorerQueries.ts` | Frontend GraphQL | Operation docs | BFF list/detail queries for Memory Home and detail pages. | One operation file for explorer queries. | Generated types |
| `autobyteus-web/graphql/queries/memoryViewQueries.ts` | Frontend GraphQL | Operation docs | Agent run and team member inspector view queries. | Keeps content view operations separate from explorer lists. | Generated types |
| `autobyteus-web/stores/memoryExplorerStore.ts` | Frontend memory | Explorer state owner | Home/detail list state, query state, selected IDs, stale response policy. | One navigation state machine. | Frontend memory types |
| `autobyteus-web/stores/memoryInspectorStore.ts` | Frontend memory | Inspector state owner | Inspect target, payload, raw trace lazy load. | Removes duplicate view stores. | `MemoryInspectTarget` |
| `autobyteus-web/pages/memory.vue` | Frontend memory | Query-driven page shell | Switch among Memory Home, Agent Memory Detail, Agent Team Memory Detail, and inspector views. | Matches existing Agents page route pattern. | Stores |
| `autobyteus-web/components/memory/MemoryHome.vue` | Frontend memory | Home view | Tabs, search, agent/team cards, empty/loading/error states. | One top-level list view. | Summary DTOs |
| `autobyteus-web/components/memory/AgentMemoryDetail.vue` | Frontend memory | Agent detail view | Selected agent header and run cards. | One detail view. | Run DTOs |
| `autobyteus-web/components/memory/AgentTeamMemoryDetail.vue` | Frontend memory | Team detail view | Selected team header, team-run cards, member buttons. | One detail view. | Team run DTOs |
| `autobyteus-web/components/memory/MemoryInspector.vue` | Frontend memory | Inspector view | Render payload tabs with direct breadcrumbs. | Existing component can be refactored rather than duplicated. | Inspector store |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Memory flags/latest timestamp from files | `memory-run-summary-builder.ts` | Backend memory | Needed by both agent and team explorer services. | Yes | Yes | A metadata or UI grouping service. |
| Paged BFF result wrapper | `domain/models.ts` or existing GraphQL pagination types | Backend memory/API | All explorer lists need page/total/pageSize. | Yes | Yes | A generic catch-all unrelated to memory. |
| Agent selector input | `AgentWithMemorySelectorInput` | Backend GraphQL/domain | Agent runs need either attributed agent definition or unattributed fallback. | Yes | Yes | A generic string selector. |
| Inspect target union | `MemoryInspectTarget` | Frontend memory types/store | Inspector loads standalone and team-member memory with distinct identities. | Yes | Yes | A scope string plus ambiguous selected ID. |
| Search/page state | `memoryExplorerStore.ts` local helpers | Frontend memory | Home and detail views share mechanics but not identities. | Yes | Yes | Global pagination store. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `MemoryAvailabilitySummary` | Yes | Yes | Low | Only file flags and `latestMemoryAt`. |
| `AgentWithMemorySummary` | Yes | Yes | Low | Use `attribution: DEFINITION | UNATTRIBUTED`; do not overload missing `agentDefinitionId`. |
| `AgentRunMemorySummary` | Yes | Yes | Low | One run ID plus display metadata and memory availability. |
| `AgentTeamWithMemorySummary` | Yes | Yes | Low | Team definition ID is required; member summary is aggregate display only. |
| `AgentTeamRunMemorySummary` | Yes | Yes | Low | Team run ID plus member memory targets; no standalone run fields. |
| `TeamMemberMemoryTargetSummary` | Yes | Yes | Low | Include `memberRunId`, optional member route key/name, and memory availability. |
| `MemoryInspectTarget` | Yes | Yes | Low | Discriminated union: `agent_run` vs `team_member_run`. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-memory/domain/models.ts` | Backend memory | Domain DTO owner | Add `MemoryAvailabilitySummary`, `AgentWithMemorySummary`, `AgentRunMemorySummary`, `AgentTeamWithMemorySummary`, `AgentTeamRunMemorySummary`, `TeamMemberMemoryTargetSummary`, and paged result types. | Existing memory model home; keeps shared shapes tight. | Yes |
| `autobyteus-server-ts/src/agent-memory/services/memory-run-summary-builder.ts` | Backend memory | File-summary concern | Build memory availability for a run/member directory. | Prevents duplicated MemoryFileStore flag logic. | Yes |
| `autobyteus-server-ts/src/agent-memory/services/agent-memory-explorer-service.ts` | Backend memory | Agent BFF read-model owner | List agents with memory and runs for one selected agent/unattributed fallback. | One standalone-agent owner. | Yes |
| `autobyteus-server-ts/src/agent-memory/services/team-memory-explorer-service.ts` | Backend memory | Team BFF read-model owner | List teams with memory and team runs/member targets for one selected team. | One team owner. | Yes |
| `autobyteus-server-ts/src/api/graphql/types/memory-explorer.ts` | Backend GraphQL | Transport boundary | Schema/resolvers for `listAgentsWithMemory`, `listAgentRunsWithMemory`, `listAgentTeamsWithMemory`, `listAgentTeamRunsWithMemory`. | Explicit BFF query surface. | Domain DTOs |
| `autobyteus-server-ts/src/api/graphql/types/memory-view.ts` | Backend GraphQL | Payload transport | Keep/refine payload view queries; expose `getAgentRunMemoryView` name if replacing generic `getRunMemoryView`. | Separates payload reads from explorer lists. | Existing view DTOs |
| `autobyteus-web/pages/memory.vue` | Frontend memory | Page shell | Query-driven page/view switch and navigation handler. | Consistent with `agents.vue`. | Stores/components |
| `autobyteus-web/stores/memoryExplorerStore.ts` | Frontend memory | Navigation/list state owner | Fetch BFF lists, store current results, search/page state, stale response handling. | One place owns Memory navigation state. | Generated GraphQL types |
| `autobyteus-web/stores/memoryInspectorStore.ts` | Frontend memory | Inspector state owner | Fetch payload for `MemoryInspectTarget`, manage tabs/raw traces. | Removes duplicate view stores. | Generated GraphQL types |
| `autobyteus-web/components/memory/MemoryHome.vue` | Frontend memory | Home presentation | Agents with Memory / Agent Teams with Memory tabs, cards, search, empty states. | Direct top-level UX. | Summary DTOs |
| `autobyteus-web/components/memory/AgentMemoryDetail.vue` | Frontend memory | Agent detail presentation | Selected agent header, run list, run search, inspect action. | Direct selected-agent UX. | Run DTOs |
| `autobyteus-web/components/memory/AgentTeamMemoryDetail.vue` | Frontend memory | Team detail presentation | Selected team header, team run list, member memory buttons. | Direct selected-team UX. | Team run DTOs |
| `autobyteus-web/components/memory/MemoryInspector.vue` | Frontend memory | Inspector presentation | Breadcrumb, tabs, payload cards, raw trace controls. | Existing content component can be refactored. | `MemoryInspectorStore` |
| `autobyteus-web/types/memory.ts` | Frontend memory | UI type aliases | UI discriminated targets and local helper types if generated GraphQL types are too transport-specific. | Keeps component props explicit. | Generated GraphQL types |

## Ownership Boundaries

- `AgentMemoryExplorerService` is the authoritative backend boundary for independent agent memory navigation. Callers must not scan `MemoryFileStore` and then separately call run-history services to rebuild agent cards.
- `TeamMemoryExplorerService` is the authoritative backend boundary for team memory navigation. Callers must not infer member memory targets from raw team metadata in the frontend.
- `AgentMemoryService` remains the authoritative backend boundary for memory payload content. Explorer services should summarize availability and metadata, not parse full payload sections.
- `MemoryExplorerStore` is the frontend authority for navigation/list state. Components should render and dispatch actions, not own fetch orchestration or stale response policy.
- `MemoryInspectorStore` is the frontend authority for inspector payload and raw-trace lazy loading. Components should not call view queries directly.
- Definition catalogs are enrichment sources only. No boundary may include a configured agent/team in Memory Home unless persisted memory evidence exists.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `AgentMemoryExplorerService` | Memory dir scan, run history lookup, display-name fallback, unattributed grouping, search/page. | `MemoryExplorerResolver`. | Resolver or frontend reads `MemoryFileStore` and run-history services separately to build agent cards. | Add explicit service methods/DTO fields. |
| `TeamMemoryExplorerService` | Team memory scan, team-run metadata lookup, member target filtering, team card aggregation. | `MemoryExplorerResolver`. | Resolver or frontend derives member memory targets from raw team metadata. | Add explicit team run/member DTO fields. |
| `AgentMemoryService` | Layout-specific payload reads through `MemoryFileStore`. | `MemoryViewResolver`. | Inspector store calls file/layout APIs directly. | Add payload view query fields. |
| `MemoryExplorerStore` | Query state, selection resets, list fetching, stale response handling. | Memory page/components. | Components each run their own Apollo queries and reset each other manually. | Add store actions/getters. |
| `MemoryInspectorStore` | Inspect target, payload fetch, active tab, raw trace limit. | `MemoryInspector`. | Separate agent/team inspector stores duplicate raw trace behavior. | Extend discriminated target support. |

## Dependency Rules

Allowed:

- GraphQL resolvers may depend on explorer services and payload services.
- Explorer services may depend on `MemoryFileStore`, run-history/team metadata services, and optional definition lookup services for enrichment.
- Explorer services may use a shared memory availability builder.
- Frontend stores may depend on generated GraphQL operations and local memory UI types.
- Components may depend on stores and emitted navigation events.

Forbidden:

- Frontend must not reconstruct agents-with-memory or teams-with-memory from flat run snapshots.
- Frontend must not use the configured Agents/Agent Teams catalogs as the Memory Home source.
- `MemoryFileStore` must not depend on run-history, definition catalogs, GraphQL DTOs, or UI labels.
- `MemoryExplorerResolver` must not own grouping/enrichment policy.
- Components must not directly call both explorer and payload queries for the same interaction if a store action owns the sequence.
- Do not introduce one generic `listMemory(scope, id)` query; identity meanings differ for agents, teams, runs, and team members.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Owned Area | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `listAgentsWithMemory(search,page,pageSize)` | Agents with Memory | Page independent agents that have inspectable memory. | Search/page only. | Excludes configured agents without memory. |
| `listAgentRunsWithMemory(agentSelector,search,page,pageSize)` | Agent runs | Page runs for one selected agent or the unattributed fallback. | `AgentWithMemorySelectorInput { attribution, agentDefinitionId? }` | `UNATTRIBUTED` requires no `agentDefinitionId`. |
| `listAgentTeamsWithMemory(search,page,pageSize)` | Agent Teams with Memory | Page agent teams that have inspectable team/member memory. | Search/page only. | Excludes configured teams without memory. |
| `listAgentTeamRunsWithMemory(teamDefinitionId,search,page,pageSize)` | Team runs | Page team runs for one selected team, including member memory targets. | `teamDefinitionId: string` | Team-run identity remains separate. |
| `getAgentRunMemoryView(runId, includeRawTraces, rawTraceLimit)` | Agent run inspector | Load payload for one standalone run. | `runId: string` | May replace/rename generic `getRunMemoryView`. |
| `getTeamMemberRunMemoryView(teamRunId, memberRunId, includeRawTraces, rawTraceLimit)` | Team member inspector | Load payload for one member inside one team run. | `teamRunId + memberRunId` | Existing compound identity is correct. |
| `memoryExplorerStore.openAgentMemory(agentSelector)` | Frontend navigation | Open Agent Memory Detail and fetch runs. | Explicit selector object. | No generic string. |
| `memoryExplorerStore.openTeamMemory(teamDefinitionId)` | Frontend navigation | Open Agent Team Memory Detail and fetch team runs. | `teamDefinitionId`. | No team run ID accepted. |
| `memoryInspectorStore.inspect(target)` | Frontend inspector | Load memory payload for a discriminated target. | `MemoryInspectTarget`. | No ambient scope lookup. |

Rule: do not use one generic boundary when the identity meaning differs. Split boundaries by owned area or require an explicit compound identity shape.

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `listAgentsWithMemory` | Yes | Yes | Low | None. |
| `listAgentRunsWithMemory` | Yes | Yes | Low | Use structured selector for attributed vs unattributed. |
| `listAgentTeamsWithMemory` | Yes | Yes | Low | None. |
| `listAgentTeamRunsWithMemory` | Yes | Yes | Low | Require `teamDefinitionId`; do not accept team run ID. |
| `getAgentRunMemoryView` | Yes | Yes | Low | Rename from generic `getRunMemoryView` if feasible. |
| `getTeamMemberRunMemoryView` | Yes | Yes | Low | Existing compound identity is acceptable. |
| `memoryInspectorStore.inspect` | Yes | Yes | Low | Use discriminated union target. |

## Main Domain Naming Check

| Node / Area | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Home tab | `Agents with Memory` | Yes | Low | Approved direct label. |
| Home tab | `Agent Teams with Memory` | Yes | Low | Approved direct label. |
| Agent detail | `Agent Memory Detail` | Yes | Low | Header can be `<Agent Name> Memory`. |
| Team detail | `Agent Team Memory Detail` | Yes | Low | Header can be `<Team Name> Memory`. |
| Inspector | `Memory Inspector` | Yes | Low | Do not prefix with abstract terms. |
| Fallback | `Unattributed runs` | Yes | Medium | Explain these are inspectable runs without attribution metadata. |
| Backend service | `AgentMemoryExplorerService` | Yes | Low | BFF read-model owner; not a UI label. |
| Backend service | `TeamMemoryExplorerService` | Yes | Low | BFF read-model owner; not a UI label. |

## Applied Patterns (If Any)

- **Backend-for-frontend read model**: `AgentMemoryExplorerService` and `TeamMemoryExplorerService` return UI-ready cards/lists so the frontend does not duplicate grouping/enrichment policy.
- **Repository/persistence boundary**: `MemoryFileStore` remains pure file IO behind services.
- **Discriminated union**: `MemoryInspectTarget` keeps standalone and team-member inspector identities explicit.
- **Small state machine**: `MemoryExplorerStore` manages view transitions/reset rules; `MemoryInspectorStore` manages tab/raw trace transitions.
- **Adapter/transport boundary**: GraphQL resolvers adapt domain DTOs to schema types but do not own grouping policy.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-memory/` | Folder | Backend memory subsystem | Memory payload and explorer read-model code. | Existing memory capability area. | UI components, GraphQL transport-only logic. |
| `autobyteus-server-ts/src/agent-memory/domain/models.ts` | File | Memory domain DTOs | Shared memory summary/explorer/payload DTOs. | Existing domain model path. | GraphQL decorators or Vue types. |
| `autobyteus-server-ts/src/agent-memory/services/memory-run-summary-builder.ts` | File | Memory availability builder | File flag/latest timestamp summaries. | Shared service concern. | Metadata grouping or pagination policy. |
| `autobyteus-server-ts/src/agent-memory/services/agent-memory-explorer-service.ts` | File | Agent Memory Explorer | Agent-with-memory grouping and run listing. | Standalone memory navigation owner. | Team-run/member logic. |
| `autobyteus-server-ts/src/agent-memory/services/team-memory-explorer-service.ts` | File | Team Memory Explorer | Team-with-memory grouping, team run listing, member targets. | Team memory navigation owner. | Standalone unattributed grouping. |
| `autobyteus-server-ts/src/api/graphql/types/memory-explorer.ts` | File | GraphQL explorer transport | Schema/resolver types for BFF queries. | API layer. | File scanning/grouping policy. |
| `autobyteus-server-ts/src/api/graphql/types/memory-view.ts` | File | GraphQL payload transport | Payload view queries. | Existing API layer. | Explorer list grouping. |
| `autobyteus-web/pages/memory.vue` | File | Frontend page shell | Query-driven view switch and navigation. | Matches existing page style. | BFF grouping logic. |
| `autobyteus-web/components/memory/` | Folder | Frontend memory UI | Home, detail, run cards, inspector components. | Existing memory component folder. | Store fetch orchestration. |
| `autobyteus-web/components/memory/MemoryHome.vue` | File | Home UI | Agents/teams with memory tabs and cards. | Direct first screen. | Run-level inspector payload. |
| `autobyteus-web/components/memory/AgentMemoryDetail.vue` | File | Agent detail UI | Agent run list. | Direct selected-agent screen. | Team run/member logic. |
| `autobyteus-web/components/memory/AgentTeamMemoryDetail.vue` | File | Team detail UI | Team run list and member memory buttons. | Direct selected-team screen. | Standalone run grouping. |
| `autobyteus-web/components/memory/MemoryInspector.vue` | File | Inspector UI | Tabs, breadcrumbs, raw trace controls. | Existing component can be adapted. | Global scope/index state. |
| `autobyteus-web/stores/memoryExplorerStore.ts` | File | Frontend navigation state | BFF list fetching and page state. | Store layer. | Payload tab/raw trace policy. |
| `autobyteus-web/stores/memoryInspectorStore.ts` | File | Frontend inspector state | Payload fetching and raw trace lazy loading. | Store layer. | Agent/team card pagination. |
| `autobyteus-web/graphql/queries/memoryExplorerQueries.ts` | File | Frontend GraphQL docs | Explorer operations. | GraphQL folder. | UI state. |
| `autobyteus-web/graphql/queries/memoryViewQueries.ts` | File | Frontend GraphQL docs | Payload operations. | GraphQL folder. | Explorer operations if split is clearer. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `agent-memory/services` | Main-Line Domain-Control plus off-spine summary builder | Yes | Low | Existing service folder is acceptable; split explorer services by owned area. |
| `api/graphql/types` | Transport | Yes | Low | Resolvers adapt service DTOs only. |
| `autobyteus-web/components/memory` | Presentation | Yes | Medium | Keep components by page/view responsibility; avoid another monolithic panel. |
| `autobyteus-web/stores` | Frontend state/control | Yes | Low | Two stores map to navigation vs inspector ownership. |
| `autobyteus-web/graphql/queries` | Transport documents | Yes | Low | Operation documents only. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Agent flow | `Agents with Memory -> Codex card -> Codex Agent Runs -> run Memory Inspector` | `Agent Runs -> flat run IDs -> manual run ID` | Matches the user's mental model. |
| Team flow | `Agent Teams with Memory -> Software Engineering Team card -> team runs -> solution_designer member -> Memory Inspector` | `Team Runs -> hundreds of repeated team rows -> inline expansion in flat list` | Reduces scan burden. |
| Backend source of truth | Start from `memory/agents` and `memory/agent_teams`, then enrich from metadata. | Start from configured Agents/Agent Teams and mark some as empty. | Prevents showing no-memory entries. |
| Backend API identity | `listAgentTeamRunsWithMemory(teamDefinitionId: "software-engineering-team")` | `listMemory(id: "software-engineering-team")` | Avoids ambiguous selectors. |
| Inspector target | `{ kind: 'team_member_run', teamRunId, memberRunId }` | `{ scope: 'team', selectedId: memberRunId }` | Keeps team-run context attached to member memory. |
| UI naming | `Memory Inspector`, `Agents with Memory` | `Memory Subjects` | Direct labels avoid user confusion. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep current flat panel behind a toggle | Might reduce implementation risk. | Rejected | Replace with page-based Memory Home/detail/inspector flow. |
| Keep `listRunMemorySnapshots` as primary frontend query | Existing tests and store already use it. | Rejected | Add BFF queries and update tests/stores. |
| Frontend grouping of flat run snapshots | Avoids backend changes. | Rejected | Backend owns memory-derived agent/team catalog and filtering. |
| Start Memory Home from configured agent/team catalogs | Similar to Agents page data source. | Rejected | Memory Home starts from stored memory evidence only. |
| Use one generic `listMemory(scope,id)` query | Less schema surface. | Rejected | Use explicit queries for agents, agent runs, teams, and team runs. |
| Keep separate agent/team inspector stores | Fewer immediate changes. | Rejected unless implementation proves consolidation unsafe | Use `MemoryInspectorStore` with discriminated targets. |
| Compatibility wrapper for old GraphQL index queries | Might protect unknown external consumers. | Rejected for in-repo primary UX | If real external consumers are discovered, route requirement gap. |

## Derived Layering (If Useful)

- Presentation layer: Memory page/components render approved labels, cards, detail pages, and inspector tabs.
- Frontend state layer: `MemoryExplorerStore` and `MemoryInspectorStore` own navigation and payload state.
- GraphQL transport layer: explorer and view operation documents/resolvers carry typed contracts.
- Backend read-model layer: `AgentMemoryExplorerService` and `TeamMemoryExplorerService` own memory-derived catalog/list shaping.
- Backend payload layer: `AgentMemoryService` and `MemoryFileStore` own memory content reads and file IO.

This layering is explanatory only; ownership boundaries above remain authoritative.

## Migration / Refactor Sequence

1. **Backend shared DTOs and summary builder**
   - Add memory availability and explorer summary types.
   - Extract reusable file flag/latest timestamp summary logic.
   - Unit-test the builder against standalone and team-member layouts.
2. **Backend Agent Memory Explorer**
   - Implement `listAgentsWithMemory` and `listAgentRunsWithMemory` service methods.
   - Group attributed runs by `agentDefinitionId`.
   - Add `Unattributed runs` fallback for standalone memory dirs without usable metadata.
   - Unit-test memory-derived inclusion/exclusion, search, pagination, sorting, and fallback behavior.
3. **Backend Team Memory Explorer**
   - Implement `listAgentTeamsWithMemory` and `listAgentTeamRunsWithMemory`.
   - Group only teams with inspectable member memory/team-run memory.
   - Include member memory targets per team run.
   - Unit-test inclusion/exclusion, member target summaries, search, pagination, sorting.
4. **GraphQL schema and generated types**
   - Add `memory-explorer` GraphQL types/resolvers and frontend operations.
   - Rename/refine standalone payload query to `getAgentRunMemoryView` if implementation chooses clean-cut naming.
   - Regenerate frontend GraphQL types.
   - Remove flat index GraphQL usage from frontend.
5. **Frontend state refactor**
   - Add `memoryExplorerStore.ts` and `memoryInspectorStore.ts`.
   - Implement query-driven view state matching the existing Agents page pattern.
   - Add stale-response handling and raw-trace lazy-load behavior.
6. **Frontend component/page refactor**
   - Replace `MemoryIndexPanel.vue` with Memory Home/detail components.
   - Refactor `MemoryInspector.vue` to use explicit `MemoryInspectTarget` and direct breadcrumbs.
   - Add approved labels and empty/error/loading states.
7. **Tests and validation**
   - Replace old flat UI/store tests with page-flow tests.
   - Add backend tests for 100 configured/5 memory-bearing inclusion scenarios.
   - Add frontend tests for agent flow and team flow.
   - Verify Raw Traces are lazy-loaded.
8. **Removal cleanup**
   - Delete obsolete stores/components/queries/tests.
   - Run localization guards, type checks, backend unit tests, frontend tests, and GraphQL codegen checks.

## Key Tradeoffs

- BFF read models increase backend surface area, but they keep memory-derived grouping and inclusion rules authoritative and testable.
- Query-driven views in one `memory.vue` page match existing Agents/Agent Teams pages and avoid unnecessary router churn, though they require careful query validation.
- A unified inspector store requires more refactor than keeping two view stores, but removes duplicated raw-trace and target-selection behavior.
- `Unattributed runs` is not as polished as attributed agent cards, but it prevents data loss for legacy memory directories and communicates metadata limitations honestly.
- Persistent indexing is deferred to avoid premature infrastructure; the API shape still allows adding an internal cache later.

## Risks

- Unknown external GraphQL consumers may still use flat memory index queries. Code search found no in-repo consumers beyond the current Memory UI/tests; route a requirement gap if implementation finds external contracts.
- Large memory directories could make scan/enrichment slow. Mitigate with pagination, summary builder reuse, and targeted profiling; add internal cache later only if needed.
- Some historical memory directories lack metadata. Mitigate with `Unattributed runs` and tolerant enrichment.
- Naming drift could reintroduce abstract labels. Tests or localization assertions should verify no user-facing `Memory Subjects` label appears.
- Query/state mismatch could leave stale breadcrumbs. Mitigate with store-owned reset rules and stale response tokens.

## Guidance For Implementation

- Treat stored memory evidence as the source of Memory Home inclusion. Definition catalogs are display enrichment only.
- Keep user-facing labels direct and consistent with the prototype.
- Prefer clean-cut replacement over compatibility wrappers; remove flat primary UI paths and update tests accordingly.
- Keep the memory payload read path stable unless a concrete implementation need appears.
- Add focused tests before broad E2E work:
  - backend BFF inclusion/exclusion for agents and teams;
  - `Unattributed runs` fallback;
  - selected-agent and selected-team run filtering;
  - team member target visibility;
  - raw trace lazy loading;
  - frontend page flows and breadcrumbs.
- Use the text prototype as the UI reference, not the old screenshot layout.
