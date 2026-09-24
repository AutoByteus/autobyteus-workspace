# Design Spec: Memory Explorer: fast Agent Teams and new Agent Orgs tab

## Solution And Approval Basis

- Current solution revision ID: `SR-003` (design clarification incorporating ARCH-REV-001 REC-001…004; SR-002 approach unchanged)
- Approved requirements baseline / revision and user-approval reference: `requirements-doc.md` @ SR-002. SR-001 (REQ-001…005) was explicitly approved by the user on 2026-09-24. REQ-006…008 (Agent Orgs tab) were added by user direction in the same message. REQ-009/010 are disclosed defect corrections (see the requirements Document Status).
- Behavior-defining supplements and their approval references: None.
- Design status: `Ready`
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-team-view-slow-load/tickets/in-progress/memory-team-view-slow-load/investigation-notes.md`

## Current-State Read

**Team explorer (backend).** `TeamMemoryExplorerService.buildGroups()` serves both `listAgentTeamsWithMemory` and `listAgentTeamRunsWithMemory`. For each stored root it reads the tree once, then calls `TeamMemoryMemberTargetBuilder.build(teamRunId)`. That builder calls `AgentMemoryLocationService.listTeamMemberLocations`, which calls the unscoped `TeamRunExecutionTreeLocationService.listAgents()`. The result is that **every** tree is re-read and validated **once per root** (N² = about 285k tree reads). The explorer depends on the tree location service and on a wrapper around that same service, which is a mixed-level dependency. The member record keeps the *configured placement* and reports its `agentRunId`, so a delegated task instance is shown under the configured member's run ID (BEH-009).

**Frontend.** `pages/memory.vue` treats the route as the view state. Every click handler fetches first (`openTeamMemory`, `openAgentMemory`, `inspectorStore.inspect`) and then `router.push`es. The route watcher `syncRouteState` fetches again. The detail list is not reset when the selection changes (BEH-004). The team member type uses `memberName`, but the API returns `displayName` (BEH-008).

**Agent Orgs.** Orgs are an independent persistence family (`agent_orgs/`, `AgentOrgExecutionTreeLocationService`, `agent_org_run_history_index.json`). Their member placement model matches teams (configured agents, agents inside configured teams, task executions). The memory explorer has no org surface. Memory sync does not carry orgs.

Evidence: investigation notes, "Source Log", "Runtime, Probe, Or Reproduction Findings" and "Architecture Investigation Findings".

## Task Size And Architectural Risk (Mandatory)

- Task size: `Large`
- Size rationale and supporting evidence: about 30 files across two packages. Backend: agent-memory services (a new shared catalog core plus two family sources, one refactored team service, one new org service), two location services, the GraphQL schema/resolvers for explorer and view, and domain models. Frontend: types, two query modules, generated GraphQL types, two stores, four components, the memory page and en/zh-CN localization. Tests on both sides. It is a new user-facing feature (Agent Orgs tab) plus a performance fix plus a navigation-ownership change.
- Architectural risk: `High`
- Risk rationale and supporting evidence: (1) the GraphQL contract changes: three additive queries and four types, and the shared member-target type is renamed from `TeamMemberMemoryTargetSummary` to `CollaborationMemberMemoryTargetSummary`. (2) Public location-service APIs change: `AgentOrgExecutionTreeLocationService` gains root-scoped `listAgents` and `listRootRunIds`; `AgentMemoryLocationService.listTeamMemberLocations` is removed and `resolveAgentOrgMemberLocation` is added. `resolveTeamMemberLocation` has four callers outside the memory explorer. (3) A shared core is extracted across two independent persistence families, which is an ownership-boundary change. (4) Team member-target identity is corrected (REQ-010). There is no persistence, security, concurrency or deployment impact; all paths are read-only.
- Escalation trigger if implementation or validation discovers new impact: team explorer output differs from the current output in anything beyond the REQ-009/010 fields (AC-005); any query exceeds 2 s on the user's data; `resolveTeamMemberLocation` callers need a behavior change; the org tree shape does not support the configured-placement rule; codegen or localization tooling forces a contract change beyond this spec.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| curl on the live backend :29695 | Investigation notes, Runtime table | Teams 31.8 s, team runs 32.2 s, agents 0.13 s | Root cause is in the backend team path | — |
| Disposable probe (deleted) | Same | Current 40.2 s vs root-scoped 0.24 s; `buildGroups` output identical (1.76 MB, 0 fallbacks) | One root-scoped read per root is sufficient and preserves output | — |
| Code read | `team-memory-explorer-service.ts`, `team-memory-member-target-builder.ts`, `agent-memory-location-service.ts` | Mixed-level dependency; N² scan; configured-placement run ID | Single source boundary per family; member target from the located execution | — |
| Code read | `agent-org-execution-tree-location-service.ts`, `agent-org-execution-index.ts` | No root-scoped `listAgents`; same placement model as teams | Extend the org location service to mirror the team API | — |
| Code read | `agent-org-run-history-index-store.ts#readIndex` | Read-only row source | Org catalog entries from the index store, not the mutating catalog service | — |
| Code read | `collaboration-execution-location-service.ts` | "Collaboration" is the codebase's name for the team+org families | Shared core naming | — |
| Node scan | `memory/agent_orgs` | 4 org definitions, 19 runs with member memory; 5 runs with task executions | AC-007 expectations; REQ-010 matters for orgs | — |
| Code read | `memory-sync-path-policy.ts` | Orgs are not synced | Imported source → org empty state (out of scope) | — |

## Intended Change

1. **Backend: one shared, linear "collaboration root memory catalog".** A single catalog core owns iteration, member memory availability, grouping by definition, sorting, search and paging. It is fed by one **source** per persistence family: team and org. Each source reads a root's execution tree exactly once through its family's location service and returns neutral member locations. The team explorer is refactored onto the core, which removes the N² path. A new org explorer uses the same core.
2. **Backend: org GraphQL surface.** Add `listAgentOrgsWithMemory`, `listAgentOrgRunsWithMemory` and `getAgentOrgMemberRunMemoryView`. The member-target type is shared across families.
3. **Backend: the location boundary.** `AgentMemoryLocationService` stays the single member-memory-location boundary for the inspector. Team resolution becomes root-scoped, org resolution is added, and the unused list API is removed.
4. **Frontend: the route owns data loading.** Click handlers only navigate. The route sync performs exactly one fetch per view and resets detail lists when the selection identity changes.
5. **Frontend: Agent Orgs.** Add a third home tab, an org detail view and an org inspector target. Team and org detail share one presentational component, which also fixes the member name.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Requirement / AC IDs | Approved Trigger | Existing Behavior & Evidence | Approved Change / Preserved Outcome | Target Production Path & Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-001, REQ-004; AC-001, AC-003, AC-005 | Memory → Agent Teams tab | 31.8 s | Linear, ≤ 2 s; same content | DS-001 |
| BEH-002 | User | REQ-001…004; AC-002…005 | Team card click | Fetch, navigate, fetch again | Navigate immediately, one fetch, loading state | DS-004 → DS-001 |
| BEH-003 | User | REQ-002, REQ-005; AC-004, AC-006 | Member/run click | Double fetch; whole-store scan | One fetch; root-scoped resolution | DS-004 → DS-003 |
| BEH-004 | User | REQ-003; AC-004 | Switch selection | Stale runs visible | List reset on identity change | DS-004 |
| BEH-005 | System | REQ-004; AC-005 | All team queries | Correct content | Identical apart from BEH-008/009 | DS-001, DS-005 |
| BEH-006 | User | REQ-006, REQ-008; AC-003, AC-007 | Memory → Agent Orgs tab | No current supported behavior | Org definition cards | DS-002 |
| BEH-007 | User | REQ-007, REQ-008; AC-008, AC-009 | Org card / org member click | No current supported behavior | Org detail and inspector | DS-004 → DS-002 / DS-003 |
| BEH-008 | User | REQ-009; AC-010 | Open a team/org detail | Blank member name | Member name shown | DS-004 (shared detail component) |
| BEH-009 | User | REQ-010; AC-011 | Open a detail with task instances | Configured run ID shown for a task run | Own run ID | DS-005 |

## Relevant Supplemental Task Artifacts

None.

## Task Design Health Assessment (Mandatory)

- Change posture: `Performance` + `Feature` (Agent Orgs) + two local `Bug Fix`es.
- Current design issue found: `Yes`
- Root cause classification: `Boundary Or Ownership Issue` (primary). The explorer depends on both the tree location service and a wrapper that rescans all trees, so member lookup is decoupled from the tree the explorer already holds. Secondary: `Duplicated Policy Or Coordination`, because adding orgs directly would duplicate grouping, sorting, search and paging. REQ-009 and REQ-010 are `Local Implementation Defect`s in the shared member structure.
- Refactor needed now: `Yes`
- Evidence: investigation notes, "Explorer structure (current)" and "Defects found in the shared member structure"; probe equivalence.
- Design response: extract `CollaborationRootMemoryCatalog` (the owner of catalog policy) plus one family source per persistence family. Each source is the **only** dependency the catalog has on that family and reads each root once. Remove `TeamMemoryMemberTargetBuilder` and `AgentMemoryLocationService.listTeamMemberLocations`. Move fetching in the frontend into the route sync.
- Refactor rationale: a local tweak such as root-scoping `listTeamMemberLocations` would fix the speed but leave two read paths per root and the mixed dependency, and the org tab would then copy about 200 lines of policy. The core makes both families linear by construction.
- Intentional deferrals and residual risk: RSK-001. Every request still stats every member's memory files; there is no caching. That is about 0.2 s at today's volume.

## Terminology

- **Collaboration root**: a root team run (`agent_teams/<id>`) or root org run (`agent_orgs/<id>`).
- **Family source**: the adapter that reads one persistence family for the memory catalog.
- **Member memory location**: one agent execution inside a root that has a configured placement, identified by its **own** `agentRunId`.

## Design Reading Order

As in the template.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Removed in scope: see the Removal / Decommission Plan. No compatibility alias is kept for the renamed GraphQL type, the removed store actions or the removed component.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Decision: `Not Affected`. All changed paths only read `team_run_execution_tree.json`, `agent_org_run_execution_tree.json`, the history indexes and memory file stats. No writer or schema changes.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, 002, 005 | Agent Teams tab / team detail route | Team cards / team runs rendered | `CollaborationRootMemoryCatalog` via `TeamMemoryExplorerService` | Carries the performance fix |
| DS-002 | Primary End-to-End | BEH-006, 007 | Agent Orgs tab / org detail route | Org cards / org runs rendered | `CollaborationRootMemoryCatalog` via `AgentOrgMemoryExplorerService` | New feature |
| DS-003 | Primary End-to-End | BEH-003, 007 | Inspector route (team/org member) | Memory Inspector tabs rendered | `AgentMemoryLocationService` → `AgentMemoryService` | Member memory view for both families |
| DS-004 | Bounded Local (frontend) | BEH-002, 003, 004, 007, 008 | User click / back / URL | One store fetch → view | `pages/memory.vue` route sync | Single-fetch ownership and stale-list reset |
| DS-005 | Bounded Local (backend) | BEH-001, 005, 006, 009 | Catalog request | Grouped definitions / runs | `CollaborationRootMemoryCatalog` | One read per root; member identity |

## Primary Execution Spine(s)

- DS-001: `MemoryHome / CollaborationMemoryDetail → memory.vue route sync → memoryExplorerStore.fetchTeams|fetchTeamRuns → GraphQL MemoryExplorerResolver → TeamMemoryExplorerService → CollaborationRootMemoryCatalog → TeamRootMemorySource → TeamRunExecutionTreeLocationService (1 tree read/root) + memory file stats → page result`
- DS-002: `MemoryHome / CollaborationMemoryDetail → memory.vue route sync → memoryExplorerStore.fetchOrgs|fetchOrgRuns → GraphQL MemoryExplorerResolver → AgentOrgMemoryExplorerService → CollaborationRootMemoryCatalog → AgentOrgRootMemorySource → AgentOrgExecutionTreeLocationService (1 tree read/root) + memory file stats → page result`
- DS-003: `CollaborationMemoryDetail member click → memory.vue route sync → memoryInspectorStore.inspect → GraphQL MemoryViewResolver.getTeamMemberRunMemoryView | getAgentOrgMemberRunMemoryView → AgentMemoryLocationService.resolveTeamMemberLocation | resolveAgentOrgMemberLocation → AgentMemoryService.getRunMemoryView → MemoryInspector`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The route selects the Teams tab or a team detail. The store sends one query. The team explorer delegates to the catalog with the team source. The catalog lists root IDs, reads each root once through the source, computes member memory availability, groups by team definition, sorts, filters, pages and returns neutral records. The service maps them to team DTOs. | Route sync, explorer store, team explorer service, catalog, team source | Catalog (policy); team service (subject mapping) | Catalog rows, memory stats, page utility |
| DS-002 | The same as DS-001, but for orgs through the org source and the org service. | Same, org variants | Same | Org index store |
| DS-003 | The route selects an inspector target. The inspector store sends one view query for the target's family. The resolver asks `AgentMemoryLocationService` for the member's memory dir (root-scoped), then reads the view through `AgentMemoryService`. | Route sync, inspector store, view resolver, location service, memory service | `AgentMemoryLocationService` (location); `AgentMemoryService` (view) | Source resolution (local/imported) |
| DS-004 | A click only pushes a route. The watcher runs `syncRouteState`: load sources, set the selection from the route (resetting the list if the identity changed), then one fetch. | Page, stores | `pages/memory.vue` | — |
| DS-005 | `for rootId of source.listRootRunIds(): record = source.readRoot(rootId)` (skip with a warning on error) → `targets = buildCollaborationMemberMemoryTargets(record.members)` → skip if empty → group by `definitionId` and resolve the name from the catalog entry → summaries | Catalog | Catalog | Member target builder |

## Spine Actors / Main-Line Nodes

Route sync (`pages/memory.vue`); `memoryExplorerStore` and `memoryInspectorStore`; `MemoryExplorerResolver` and `MemoryViewResolver`; `TeamMemoryExplorerService` and `AgentOrgMemoryExplorerService`; `CollaborationRootMemoryCatalog`; `TeamRootMemorySource` and `AgentOrgRootMemorySource`; `AgentMemoryLocationService`; `AgentMemoryService`.

## Ownership Map

- `pages/memory.vue`: owns the mapping between route and view and is the **single fetch trigger** for route-driven views. It owns no data.
- `memoryExplorerStore`: owns list state (entries, paging, search, loading, error, requestId) per subject: agents, agentRuns, teams, teamRuns, orgs, orgRuns. It also owns the selection identity and resets a list when the identity changes.
- `memoryInspectorStore`: owns the inspector target, the memory view, and which view query to use for each target kind.
- `CollaborationMemoryDetail.vue`: presentational only. It renders a run list with members and emits user intents.
- `MemoryExplorerResolver` / `MemoryViewResolver`: transport. They resolve the source (local/imported), construct the service and return DTOs.
- `TeamMemoryExplorerService` / `AgentOrgMemoryExplorerService`: the subject-specific public explorer boundary. Each owns the mapping from neutral catalog records to subject DTOs (team or org field names) and constructs its family source.
- `CollaborationRootMemoryCatalog`: owns catalog **policy**, meaning iteration, the skip-invalid-root rule, filtering members to those with memory, group-name resolution, merged availability, sort order, search matching and paging.
- `TeamRootMemorySource` / `AgentOrgRootMemorySource`: own family-specific **reading**. That covers root IDs, one tree read per root, the configured-placement member rule, the display label, and catalog entries (history index).
- `buildCollaborationMemberMemoryTargets`: owns per-member memory availability (file stats).
- `AgentMemoryLocationService`: the authoritative member-memory-location resolver for inspection (team and org).
- `AgentOrgExecutionTreeLocationService`: owns org tree reading and location projection, including admission checks.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `TeamMemoryExplorerService` | `CollaborationRootMemoryCatalog` + `TeamRootMemorySource` | Stable, team-typed boundary for the resolver; maps to team DTOs | Grouping, sort, search or paging policy |
| `AgentOrgMemoryExplorerService` | Same, with the org source | Org-typed boundary | Same |

## Removal / Decommission Plan (Mandatory)

| Item To Remove | Why Unnecessary | Replaced By | Scope | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-memory/services/team-memory-member-target-builder.ts` | Its per-root lookup is the N² source | `collaboration-member-memory-targets.ts` fed by the source's single read | In This Change | — |
| `AgentMemoryLocationService.listTeamMemberLocations` | Only caller was the builder | Sources use their family location service directly | In This Change | Move its location-derivation assertions to a `TeamRunExecutionTreeLocationService.listAgents({rootTeamRunId})` test |
| `TeamMemoryExplorerService` private `buildGroups`, `safeReadTree`, `readCatalogRowsByTeamRunId`, `groupMatches`, `runMatches`, `compare*`, `toMemberTargetSummary`; the `treeLocations`/`catalogService` constructor dependencies | Moved into the catalog core and the team source | `CollaborationRootMemoryCatalog`, `TeamRootMemorySource` | In This Change | Constructor becomes `(memoryDir, { source? })` |
| Domain/GraphQL type `TeamMemberMemoryTargetSummary` | Now shared by teams and orgs | `CollaborationMemberMemoryTargetSummary` (same fields) | In This Change | No alias |
| Web type `TeamMemberMemoryTargetSummary` (with the wrong `memberName`) | Defect, now shared | `CollaborationMemberMemoryTargetSummary` (`displayName`) | In This Change | — |
| `memoryExplorerStore.openAgentMemory` / `openTeamMemory` | Only served fetch-before-navigate | Route sync + `setSelected*FromRoute` | In This Change | — |
| Fetch/inspect calls inside `selectAgent`, `selectTeam`, `inspectAgentRun`, `inspectTeamMember` in `pages/memory.vue` | Duplicate fetch | Route sync | In This Change | Handlers only push the route |
| `components/memory/AgentTeamMemoryDetail.vue` + its spec | Replaced by the shared presentational detail | `CollaborationMemoryDetail.vue` | In This Change | Move its localization keys |
| Private `AgentOrgExecutionTreeLocationService.listRootIds` | Becomes public | `listRootRunIds()` | In This Change | Rename; internal callers updated |

## Return Or Event Spine(s) (If Applicable)

N/A. These are request/response queries.

## Bounded Local / Internal Spines (If Applicable)

- DS-004, parent owner `pages/memory.vue`: `click → router.push(query) → watch(route.fullPath) → syncRouteState → loadSources → setSelected*FromRoute (reset if identity changed) → one fetch* / inspect → render`.
- DS-005, parent owner `CollaborationRootMemoryCatalog`: `listRootRunIds → readRoot (1 tree read; on throw: warn + skip) → buildCollaborationMemberMemoryTargets → drop root if no targets → group → merge → sort → filter → page`.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| `buildCollaborationMemberMemoryTargets` | DS-001/002/005 | Catalog | Memory availability per member location; drops members without memory; sorts by `displayName` | Shared by both families | In a source it would duplicate; in the catalog it would bloat the file |
| `memory-explorer-page.ts` (existing) | DS-001/002 | Catalog | Search normalization, `includes`, paging | Existing utility | — |
| `MemoryRunSummaryBuilder` (existing) | DS-005 | Member target builder | File stats → availability | Existing | — |
| Catalog entries (team `TeamRunHistoryCatalogService.listCatalogRows`, org `AgentOrgRunHistoryIndexStore.readIndex`) | DS-001/002 | Family sources | Summary, workspace, createdAt and name per root | Family-owned history | Reading them in the catalog would couple it to both families |
| `readMemberRunMemoryView` (resolver-local function) | DS-003 | `MemoryViewResolver` | Shared "memoryDir → `AgentMemoryView`" read for team and org member views | Avoids a duplicated resolver body | — |

## Ownership Boundaries

- The catalog depends only on the `CollaborationRootMemorySource` interface. It never imports team or org modules.
- Each source depends only on its own family's location service and history reader. The team source does **not** use `AgentMemoryLocationService`, which removes today's mixed-level dependency.
- Resolvers depend on explorer services and `AgentMemoryLocationService`, never on sources or location services directly.
- The web page depends on stores; components depend on props and emits (the detail component) or on the store (`MemoryHome`, `MemoryInspector`, unchanged pattern).

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `TeamMemoryExplorerService` / `AgentOrgMemoryExplorerService` | Catalog, source, location services, history readers | `MemoryExplorerResolver` | Resolver building catalog/source itself | Add a service method |
| `CollaborationRootMemoryCatalog` | Member target builder, page utility | Explorer services | Services re-implementing sort/search/paging | Extend the catalog |
| `AgentMemoryLocationService` | Team/org tree location services | `MemoryViewResolver`, skill improvement, application orchestration/execution scope | Resolver calling `AgentOrgExecutionTreeLocationService.findAgent` directly | Add a resolve method |
| `AgentOrgExecutionTreeLocationService` | Tree store, package catalog, index | Org source, `AgentMemoryLocationService`, `CollaborationExecutionLocationService` | Reading `agent_org_run_execution_tree.json` directly | Add a method |

## Dependency Rules

- Allowed: `api/graphql/types/memory-explorer.ts → *MemoryExplorerService → CollaborationRootMemoryCatalog → CollaborationRootMemorySource (interface)`; `TeamRootMemorySource → run-history (TeamRunExecutionTreeLocationService, TeamRunHistoryCatalogService)`; `AgentOrgRootMemorySource → agent-org-execution (AgentOrgExecutionTreeLocationService) + run-history (AgentOrgRunHistoryIndexStore)`; `memory-view.ts → AgentMemoryLocationService, AgentMemoryService`.
- Forbidden: the catalog importing any team or org module; a source importing `AgentMemoryLocationService`; resolvers importing sources or tree location services; the org explorer using `AgentOrgRunHistoryCatalogService`, whose initialization owns index reconciliation and writes; any web click handler calling a store fetch or `inspectorStore.inspect` directly.

## Interface Boundary Mapping

| Interface / API / Query / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| GraphQL `listAgentTeamsWithMemory` / `listAgentTeamRunsWithMemory` | Team definitions / team runs | Unchanged signatures | `teamDefinitionId` | `memberTargets` type renamed |
| GraphQL `listAgentOrgsWithMemory(source, search, page, pageSize): AgentOrgWithMemoryPage` | Org definitions | New | — | Entries `{orgDefinitionId, orgDefinitionName, orgRunCount, memberMemoryCount, latestMemoryAt, memory}` |
| GraphQL `listAgentOrgRunsWithMemory(orgDefinitionId!, source, search, page, pageSize): AgentOrgRunMemoryPage` | Org runs of one definition | New | `orgDefinitionId` | Entries `{orgRunId, orgDefinitionId, orgDefinitionName, summary, workspaceRootPath, createdAt, lastUpdatedAt, memory, memberTargets}` |
| GraphQL `getAgentOrgMemberRunMemoryView(orgRunId!, agentRunId!, source, include*…, rawTraceLimit, rawTraceFileName): AgentMemoryView` | One org member run's memory | New; same options as the team variant | `(orgRunId, agentRunId)` compound | Not found → `{ runId: agentRunId }` empty view (same as the team variant) |
| GraphQL type `CollaborationMemberMemoryTargetSummary` | Member target | `{memberAddress, displayName, agentRunId, agentDefinitionId, lastUpdatedAt, memory}` | `agentRunId` = the member execution's own run | Replaces `TeamMemberMemoryTargetSummary` |
| `CollaborationRootMemorySource.listRootRunIds(): Promise<string[]>` | Family roots | Admitted stored root IDs | — | — |
| `CollaborationRootMemorySource.readRoot(rootRunId): Promise<CollaborationRootMemoryRecord \| null>` | One root | Exactly one tree read; `null` when missing; throws when invalid | root run ID | — |
| `CollaborationRootMemorySource.readCatalogEntries(): Promise<ReadonlyMap<string, CollaborationRootCatalogEntry>>` | Family history | Read-only | — | May throw; the catalog warns and uses an empty map |
| `CollaborationRootMemoryCatalog.listDefinitions(search, page, pageSize)` / `.listRuns(definitionId, search, page, pageSize)` | Neutral catalog | Policy | `definitionId` | — |
| `AgentOrgExecutionTreeLocationService.listAgents(input?: { rootRunId?: string \| null })` | Org agent executions | Root-scoped when `rootRunId` is given (one tree; admission checked); all roots otherwise (unchanged) | root run ID | Mirrors team `listAgents({rootTeamRunId})` |
| `AgentOrgExecutionTreeLocationService.listRootRunIds()` | Org roots | Public form of the former private `listRootIds` | — | — |
| `AgentMemoryLocationService.resolveTeamMemberLocation({teamRunId, agentRunId?, memberAddress?})` | Team member memory location | Same contract, **including admission**. When `teamRunId` is in `TeamRunExecutionTreeLocationService.listRootTeamRunIds()` (active or admitted stored roots, a directory listing only), read only that root: `listAgents({rootTeamRunId})`. Otherwise search all roots for a nested team run with that ID, through the unscoped admission-aware `listAgents()`. A non-admitted stored root is therefore never read, as today (REC-001) | team run ID | REQ-005 |
| `AgentMemoryLocationService.resolveAgentOrgMemberLocation({orgRunId, agentRunId})` | Org member memory location | `orgLocations.findAgent({rootRunId, agentRunId})` → `AgentOrgMemberAgentMemoryLocation \| null` | `(orgRunId, agentRunId)` | New |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Team vs org explorer queries | Yes | Yes (`teamDefinitionId` / `orgDefinitionId`) | Low | Split by subject, no generic `listCollaborations` |
| `get*MemberRunMemoryView` | Yes | Yes (compound IDs per family) | Low | Separate team and org queries |
| `resolveTeamMemberLocation` | Yes | `teamRunId` = any team run in a root's hierarchy (existing contract) | Medium (existing) | Unchanged contract; root-first is an internal lookup order, not a second meaning |
| `CollaborationRootMemorySource` | Yes | Root run ID | Low | — |

## Main Domain Subject Naming Check

| Node / Subject | Proposed Name | Natural? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Shared catalog | `CollaborationRootMemoryCatalog` | Yes | Low; matches `CollaborationExecutionLocationService` | — |
| Family adapters | `TeamRootMemorySource`, `AgentOrgRootMemorySource` | Yes | Low | — |
| Member target | `CollaborationMemberMemoryTarget(Summary)` | Yes | Low | Replaces the Team-named type |
| Org explorer | `AgentOrgMemoryExplorerService` | Yes | Low | Matches `AgentOrg*` convention |
| Shared detail UI | `CollaborationMemoryDetail.vue` | Yes | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Paging/search helpers | `memory-explorer-page.ts` | Reuse | Already owned | — |
| Memory availability per run dir | `MemoryRunSummaryBuilder`, `MemoryFileStore` | Reuse | Already owned | — |
| Team tree read + locations | `TeamRunExecutionTreeLocationService.listAgents({rootTeamRunId, configuredOnly})` | Reuse | Root-scoped already | — |
| Org tree read + locations | `AgentOrgExecutionTreeLocationService` | Extend | Needs a root-scoped list and public root IDs | — |
| Org history rows | `AgentOrgRunHistoryIndexStore.readIndex` | Reuse | Read-only | — |
| Member memory location for the inspector | `AgentMemoryLocationService` | Extend | Existing authority | — |
| Memory view read | `AgentMemoryService.getRunMemoryView` | Reuse | — | — |
| Catalog policy shared by families | none | Create New | No owner exists; duplicating it for orgs would repeat policy | — |

## Subsystem / Capability-Area Allocation

| Subsystem | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-memory` | Catalog, sources, explorer services, member targets, location boundary, domain models | DS-001/002/003/005 | Resolvers | Extend | — |
| `autobyteus-server-ts/src/agent-org-execution` | Org tree location API | DS-002/003 | Org source, location service | Extend | — |
| `autobyteus-server-ts/src/api/graphql/types` | Schema and resolvers | DS-001/002/003 | Web | Extend | — |
| `autobyteus-web` memory feature (`pages/memory.vue`, `stores/memory*`, `components/memory`, `graphql/queries/memory*`, `types/memory.ts`, localization, `generated/graphql.ts`) | Route sync, state, UI | DS-001…004 | User | Extend | — |

## Draft File Responsibility Mapping

Drafted from the spines. It became the final mapping after the reusable-structure check, and no further change was needed.

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Group/sort/search/page over roots | `collaboration-root-memory-catalog.ts` | agent-memory | Identical policy for both families | Yes | Yes | A place that knows team or org specifics |
| Member memory targets | `collaboration-member-memory-targets.ts` | agent-memory | Both families | Yes (no `ConfiguredAgentExecutionNode` carried; only address, displayName, own run ID, definition ID, memoryDir) | Yes (one run ID) | A carrier of the whole tree/placement |
| Member target DTO | `CollaborationMemberMemoryTargetSummary` (domain, GraphQL, web) | agent-memory / api / web | Both families | Yes | Yes | — |
| Detail run list UI | `CollaborationMemoryDetail.vue` | web memory | Both families | Yes | Yes | A component that switches on family or reads the store |
| Member view read in the resolver | `readMemberRunMemoryView` (in `memory-view.ts`) | api | Two resolvers | — | — | — |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlap Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `CollaborationMemberMemoryLocation {memberAddress, displayName, agentRunId, agentDefinitionId, memoryDir}` | Yes; `agentRunId` is always the execution's own run | Yes | Low | — |
| `CollaborationRootMemoryRecord {rootRunId, definitionId, definitionName, createdAt, members}` | Yes; name and createdAt come from the tree | Yes | Low | — |
| `CollaborationRootCatalogEntry {definitionName, summary, workspaceRootPath, createdAt}` | Yes; all nullable and history-sourced | Yes | Low | Normalize empty org `summary` to `null` |
| Neutral run output `CollaborationRootRunMemory {rootRunId, definitionId, definitionName, summary, workspaceRootPath, createdAt, memory: MemoryAvailabilityBuildResult, members: CollaborationMemberMemoryTarget[]}` | Yes | Yes | Low | — |
| Web `CollaborationRunMemoryRow {runId, summary, workspaceRootPath, lastUpdatedAt, memory, memberTargets}` | Yes | Yes | Low | Built by page computeds from team/org entries |

## Final File Responsibility Mapping

| File | Owning Subsystem | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `server/src/agent-memory/services/collaboration-root-memory-catalog.ts` (Add) | agent-memory | Catalog | Source interface + neutral types + catalog policy (DS-005) | One policy owner | page utils, member targets |
| `server/src/agent-memory/services/collaboration-member-memory-targets.ts` (Add) | agent-memory | Off-spine | `CollaborationMemberMemoryLocation`, `CollaborationMemberMemoryTarget`, `buildCollaborationMemberMemoryTargets` | Single concern | `MemoryRunSummaryBuilder` |
| `server/src/agent-memory/services/team-root-memory-source.ts` (Add) | agent-memory | Team source | Team roots, one read per root, configured-only members, basename label, team catalog rows | Family reading | Yes |
| `server/src/agent-memory/services/agent-org-root-memory-source.ts` (Add) | agent-memory | Org source | Org roots, one read per root, configured-only members, address-path label, org index rows | Family reading | Yes |
| `server/src/agent-memory/services/team-memory-explorer-service.ts` (Modify) | agent-memory | Team facade | Catalog → team DTOs | Subject mapping | Yes |
| `server/src/agent-memory/services/agent-org-memory-explorer-service.ts` (Add) | agent-memory | Org facade | Catalog → org DTOs | Subject mapping | Yes |
| `server/src/agent-memory/services/team-memory-member-target-builder.ts` (Remove) | — | — | — | — | — |
| `server/src/agent-memory/services/agent-memory-location-service.ts` (Modify) | agent-memory | Location boundary | Remove `listTeamMemberLocations`; root-first `resolveTeamMemberLocation`; add `resolveAgentOrgMemberLocation`; accept `orgLocationService` | Existing owner | — |
| `server/src/agent-memory/domain/agent-memory-location.ts` (Modify) | agent-memory | Domain | Add `AgentOrgMemberAgentMemoryLocation {kind:"agent_org_member", orgRunId, ancestorTeamRunIds, memberAddress, agentRunId, configuredPlacement, memoryDir}`; add it to the union | Domain types | — |
| `server/src/agent-memory/domain/models.ts` (Modify) | agent-memory | Domain | Rename the member target type; add `AgentOrgWithMemorySummary`, `AgentOrgRunMemorySummary` | Domain types | — |
| `server/src/agent-org-execution/services/agent-org-execution-tree-location-service.ts` (Modify) | agent-org-execution | Org locations | `listAgents({rootRunId})`, public `listRootRunIds()` | Existing owner | — |
| `server/src/api/graphql/types/memory-explorer-schema.ts` (Modify) | api | Schema | Rename the member type; add the 4 org types | Schema | — |
| `server/src/api/graphql/types/memory-explorer.ts` (Modify) | api | Resolver | Add the 2 org queries | Transport | — |
| `server/src/api/graphql/types/memory-view.ts` (Modify) | api | Resolver | Add `getAgentOrgMemberRunMemoryView`; extract `readMemberRunMemoryView` | Transport | — |
| `web/types/memory.ts` (Modify) | web | Types | `CollaborationMemberMemoryTargetSummary`; org summaries; `org_member_run` inspect target | Types | — |
| `web/graphql/queries/memoryExplorerQueries.ts` (Modify) | web | Queries | Add `LIST_AGENT_ORGS_WITH_MEMORY`, `LIST_AGENT_ORG_RUNS_WITH_MEMORY` | Queries | — |
| `web/graphql/queries/memoryViewQueries.ts` (Modify) | web | Queries | Add `GET_AGENT_ORG_MEMBER_RUN_MEMORY_VIEW` | Queries | — |
| `web/generated/graphql.ts` (Regenerate) | web | Codegen | — | Generated | — |
| `web/stores/memoryExplorerStore.ts` (Modify) | web | Explorer state | `orgs`/`orgRuns`/`selectedOrg`; org actions; `homeTab` gains `'orgs'`; identity-change reset in `setSelected*FromRoute`; remove `open*Memory` | State owner | — |
| `web/stores/memoryInspectorStore.ts` (Modify) | web | Inspector state | Query and variables per kind, including `org_member_run`; `sameTarget` for org | State owner | — |
| `web/components/memory/CollaborationMemoryDetail.vue` (Add) | web | Presentational | Header, back, search, runs with members (`displayName` + `agentRunId`), states, paging. **Contract (REC-002):** props `title`, `readOnly`, `rows: CollaborationRunMemoryRow[]`, `loading`, `error`, `page`, `totalPages`, `search`; emits `back`, `search(term)`, `retry`, `changePage(page)`, `inspectMember(runId, member)`. It **must not import any store**; `pages/memory.vue` routes the emits to the family's actions (`setTeamRunsSearch`/`setOrgRunsSearch`, `fetchTeamRuns`/`fetchOrgRuns`, `changeTeamRunsPage`/`changeOrgRunsPage`) | One view | — |
| `web/components/memory/AgentTeamMemoryDetail.vue` (Remove) | — | — | — | — | — |
| `web/components/memory/MemoryHome.vue` (Modify) | web | Home | Third tab, org cards, search, empty and retry states for orgs | Existing view | — |
| `web/components/memory/MemoryInspector.vue` (Modify) | web | Inspector | Breadcrumb/metadata for `org_member_run` | Existing view | — |
| `web/pages/memory.vue` (Modify) | web | Route sync | Views `org-detail` and `org-inspector`, tab `orgs`; handlers push only; single fetch in sync; team/org row computeds; back labels | Route owner | — |
| `web/localization/messages/{en,zh-CN}/memory*.ts` (Modify) | web | i18n | Move detail keys to `CollaborationMemoryDetail`; add org tab, search and empty keys | Existing catalogs | — |

## Applied Patterns (If Any)

- **Strategy/Adapter**: `CollaborationRootMemorySource`, with the team and org sources as variants chosen by the subject facade. One catalog owner stays in control.
- **Thin facade**: the explorer services map neutral records to subject DTOs.

## Target Subsystem / Folder / File Mapping

Flat placement in `src/agent-memory/services/` is kept. It is the existing convention for this subsystem (`memory-explorer-page.ts`, `memory-run-summary-builder.ts` and both explorer services already live there), and four new cohesive files do not justify a subfolder. The web files stay in their existing feature folders. See the Final File Responsibility Mapping for paths.

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `server/src/agent-memory/services` | Main-Line Domain-Control + off-spine | Yes | Low | Existing flat convention; names carry the owner |
| `server/src/api/graphql/types` | Transport | Yes | Low | — |
| `web/components/memory` | Presentation | Yes | Low | — |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| One read per root | `readRoot(id)`: `const located = await teamLocations.listAgents({ rootTeamRunId: id, configuredOnly: true }); if (!located.length) return null; const tree = located[0].tree; return { rootRunId: id, definitionId: tree.rootTeam.teamDefinitionId.trim(), definitionName: tree.rootTeam.teamDefinitionName, createdAt: tree.createdAt ?? null, members: located.map(toMember) }` | `readTree(id)` followed by `memoryLocationService.listTeamMemberLocations(id)`, which rescans every root | This is the root cause |
| Member identity | `toMember = (l) => ({ memberAddress: l.memberAddress, displayName: basename(l.memberAddress), agentRunId: l.agentRunId, agentDefinitionId: l.configuredPlacement!.agentDefinitionId, memoryDir: l.memoryDir })` | `agentRunId: l.configuredPlacement.agentRunId` | REQ-010 |
| Org label | `/software_engineering_team/solution_designer` → `displayName: "software_engineering_team/solution_designer"`; `/ceo` → `"ceo"` | Basename only, which is ambiguous across an org's teams | REQ-007 |
| Click handler | `const selectTeam = (team) => router.push({ path: '/memory', query: cleanQuery({ view: 'team-detail', source: sourceQuery(), teamDefinitionId: team.teamDefinitionId, teamName: team.teamDefinitionName }) })` | `await explorerStore.openTeamMemory(team); router.push(...)` | REQ-002 |
| Selection reset | `setSelectedTeamFromRoute(id, name) { if (this.selectedTeam?.teamDefinitionId !== id) resetList(this.teamRuns); this.selectedTeam = {...} }`, where `resetList` clears entries/total/search and sets page 1 and totalPages 1. Returning to the same team from the inspector keeps page and search | Clearing on every sync (flash) or never clearing (stale) | REQ-003 |
| Catalog skip rule | `try { record = await source.readRoot(id) } catch (e) { console.warn(\`Skipping ${familyLabel} run '${id}' in memory explorer: ${e}\`); continue }` | One corrupt tree fails the whole page (today's latent behavior through the unscoped rescan) | AC-003 alternate |

## Preserved Team Catalog Policy (REC-004, REQ-004)

`CollaborationRootMemoryCatalog` and `TeamRootMemorySource` must carry these current team rules over exactly:

- Skip a root whose trimmed definition ID (`tree.rootTeam.teamDefinitionId.trim()`) is empty.
- Group name: the first run's `catalogEntry.definitionName?.trim() || tree definition name || definitionId`. A later run whose catalog name is non-empty upgrades the group name when it still equals `definitionId`.
- Run-level definition name: `catalogEntry.definitionName ?? tree definition name` (`??`, not `||`).
- Run `createdAt`: `catalogEntry.createdAt ?? tree.createdAt ?? null`.
- Definitions sort by `latestMemoryAt` descending, then name. Runs sort by `latestMemoryMtime` descending, then `createdAt` descending, then run ID descending.
- Search fields: run ID, tree definition name, catalog summary, catalog workspace, and for each member its `displayName`, address, own `agentRunId` and `agentDefinitionId`. Definition-level search also matches the group name and definition ID.

The org source feeds the same catalog, so the same rules apply to orgs, with the org tree and org index entry in place of the team ones.

## Architecture Review Recommendations Incorporated (ARCH-REV-001)

| Recommendation | Where Incorporated | Effect |
| --- | --- | --- |
| REC-001: root-first team resolution keeps admission | Interface Boundary Mapping → `resolveTeamMemberLocation` | Corrects the design's "same contract" claim; no behavior change |
| REC-002: explicit presentational contract | Final File Responsibility Mapping → `CollaborationMemoryDetail.vue` | Props, emits and the no-store rule are now normative |
| REC-003: REQ-010 also changes search matching | Change / Refactor Sequence, step 3 gate | Equivalence gate exceptions stated precisely |
| REC-004: preserve team fallbacks verbatim | Preserved Team Catalog Policy | Exact precedence rules are now normative |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| GraphQL alias type `TeamMemberMemoryTargetSummary` | The type is renamed | Rejected | Rename; field selections are unaffected; regenerate web types |
| Keep `listTeamMemberLocations` root-scoped for "future callers" | It is a public method | Rejected | Removed; no callers remain |
| Keep `openTeamMemory` / `openAgentMemory` | Existing store API | Rejected | Removed; the route sync owns fetches |
| Keep `AgentTeamMemoryDetail.vue` alongside the shared component | Lower churn | Rejected | Replaced |
| Web `memberName` fallback | The old field | Rejected | `displayName` only |

## Derived Layering (If Useful)

`web page/stores → GraphQL resolvers → explorer facades → catalog → family sources → family location services / history readers → filesystem`.

## Change / Refactor Sequence

1. **Org location API**: add `listAgents({rootRunId})` and public `listRootRunIds()` to `AgentOrgExecutionTreeLocationService`, with tests.
2. **Member targets and catalog**: add `collaboration-member-memory-targets.ts` and `collaboration-root-memory-catalog.ts` (policy moved verbatim from `TeamMemoryExplorerService`: name resolution, merge, `compareTeamSummaries` → definitions, `compareRuns` → runs, search fields).
3. **Team source and refactor**: add `team-root-memory-source.ts`; rewrite `TeamMemoryExplorerService` onto the catalog; rename the member type in the domain and schema; delete `team-memory-member-target-builder.ts`. Gate: the existing team explorer tests pass, and a real-data equivalence check (as the SR-001 probe did) matches. The only permitted differences are REQ-010 effects on task-instance entries: their `agentRunId`, and search results that now match the task run's own ID instead of the configured member's run ID (REC-003).
4. **Location boundary**: `AgentMemoryLocationService`: remove `listTeamMemberLocations`, make `resolveTeamMemberLocation` root-first, add `resolveAgentOrgMemberLocation` and the domain type. Retarget the tests.
5. **Org backend**: `agent-org-root-memory-source.ts`, `agent-org-memory-explorer-service.ts`, the schema types, 2 explorer queries, and the org view query with the extracted `readMemberRunMemoryView`.
6. **Web data layer**: types, queries, `pnpm codegen` against the updated backend schema (or the repo's established codegen procedure), `memoryExplorerStore`, `memoryInspectorStore`.
7. **Web UI**: `CollaborationMemoryDetail.vue` (delete `AgentTeamMemoryDetail.vue` and its spec), `MemoryHome.vue` org tab, `MemoryInspector.vue`, `pages/memory.vue` single-fetch route sync and org routes, localization (en and zh-CN, following the repo's localization generation/glossary checks).
8. **Tests** (see Guidance), then a manual check in Electron against the user's data.

## Key Tradeoffs

- **Shared catalog core vs. copying the team service for orgs.** The core adds one abstraction (a source interface). The alternative is two copies of about 200 lines of policy that would drift. The core was chosen.
- **Team catalog rows through `TeamRunHistoryCatalogService` (unchanged) vs. org rows through the index store.** The team side stays as is to satisfy REQ-004. The org side avoids the mutating catalog service because the explorer must be read-only.
- **Root-first fallback in `resolveTeamMemberLocation`.** It keeps the existing contract (a nested team run ID is accepted) while making the common root case O(1) in trees.
- **Org member label = the address path.** It is unambiguous across an org's teams. Team labels stay as the basename (REQ-004).

## Risks

- RSK-001 (accepted): per-request file stats scale with member count; there is no cache.
- Codegen: `generated/graphql.ts` must be regenerated consistently. Hand edits risk drift.
- Localization: the zh-CN glossary consistency test (`zhCnGlossaryConsistency.spec.ts`) references memory keys; moved keys must be updated in both locales.
- `resolveTeamMemberLocation` has callers outside the memory explorer: skill improvement and application orchestration/execution scope. Their existing tests must stay green.

## Guidance For Implementation

- Server tests:
  - `team-memory-explorer-service.test.ts`: keep existing expectations. Add (a) a task-instance fixture (as `agent-memory-location-service.test.ts#withTaskAgent`) with memory in `task-writer-run` → member target `agentRunId === "task-writer-run"` (AC-011); (b) a counting `TeamRunExecutionTreeStore` or location stub proving one read per root per request (AC-003); (c) a corrupt tree root is skipped while the others list.
  - New `agent-org-memory-explorer-service.test.ts`: definition grouping, org index name/summary, member address-path labels, configured-team member inclusion, task-team member exclusion, search, paging, missing index → tree name.
  - `agent-memory-location-service.test.ts`: move the `listTeamMemberLocations` derivation assertions to `listAgents({rootTeamRunId})`; add root-scoped and nested-team-ID resolution and org resolution.
  - Org location service: `listAgents({rootRunId})` reads one tree and respects admission; `listRootRunIds`.
  - `memory-explorer-types.test.ts` and the memory-view resolver tests: the org queries and the renamed type.
- Web tests: `memoryExplorerStore.test.ts` (org fetch; identity reset; removed `openAgentMemory` test replaced by a route-selection test); `pages/__tests__/memory.spec.ts` (**exactly one** runs/view request per card, run or member click; org detail/inspector routing; back labels); `CollaborationMemoryDetail.spec.ts` (member `displayName` rendered, AC-010); `MemoryHome` org tab; inspector store org query and variables.
- Validation handoff: timing of the three list queries against the user's real memory dir (AC-001, AC-002, AC-007 ≤ 2 s) and a manual Electron walkthrough of SCN-001…SCN-006.
- Do not change the existing queries' names, arguments or field names; do not touch memory sync.
