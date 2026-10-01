# Design Spec: Memory Explorer: fast Agent Teams and new Agent Orgs tab

## Solution And Approval Basis

- Current solution revision ID: `SR-004` (SR-003 is the base design; the section "SR-004 Revision" is authoritative where it differs)
- Approved requirements baseline / revision and user-approval reference: `requirements-doc.md` @ **SR-004** (user "go", 2026-09-25); history: SR-002. SR-001 (REQ-001…005) was explicitly approved by the user on 2026-09-24. REQ-006…008 (Agent Orgs tab) were added by user direction in the same message. REQ-009/010 are disclosed defect corrections (see the requirements Document Status).
- Behavior-defining supplements and their approval references: None.
- Design status: `Ready` (SR-004; requirements SR-004 approved by the user on 2026-09-25)
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
- Risk rationale and supporting evidence: (1) the GraphQL contract changes: three additive queries and four types, and the shared member-target type is renamed from `TeamMemberMemoryTargetSummary` to `CollaborationMemberMemoryTargetSummary`. (2) Public location-service APIs change: `AgentOrgExecutionTreeLocationService` gains root-scoped `listAgents` and `listRootRunIds`; `AgentMemoryLocationService.listTeamMemberLocations` is removed and `resolveAgentOrgMemberLocation` is added. `resolveTeamMemberLocation` has four callers outside the memory explorer. (3) A shared core is extracted across two independent persistence families, which is an ownership-boundary change. (4) Team member-target identity is corrected (REQ-010). (5) SR-004: an upstream merge with certain conflicts, additive member-target structure fields (`executionKind`, `groupPath`, `startedAt`), a location-API shape change (`executionKind`/`groupPath` added; `configuredOnly` removed) and frontend route-sync ownership of the sources list. There is no persistence, security, concurrency or deployment impact; all paths are read-only.
- Escalation trigger if implementation or validation discovers new impact: team explorer output differs from the baseline (`origin/personal` @ `589005470` team explorer output) in anything beyond REQ-009/010 and the REQ-012 task-execution additions with their derived aggregates (AC-005); any query exceeds 2 s on the user's data; `resolveTeamMemberLocation` callers need a behavior change; a team or org tree shape cannot be projected into `executionKind` + `groupPath` from its index; codegen or localization tooling forces a contract change beyond this spec.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| curl on the live backend :29695 | Investigation notes, Runtime table | Teams 31.8 s, team runs 32.2 s, agents 0.13 s | Root cause is in the backend team path | — |
| Disposable probe (deleted) | Same | Current 40.2 s vs root-scoped 0.24 s; `buildGroups` output identical (1.76 MB, 0 fallbacks) | One root-scoped read per root is sufficient and preserves output | — |
| Code read | `team-memory-explorer-service.ts`, `team-memory-member-target-builder.ts`, `agent-memory-location-service.ts` | Mixed-level dependency; N² scan; configured-placement run ID | Single source boundary per family; member target from the located execution | — |
| Code read | `agent-org-execution-tree-location-service.ts`, `agent-org-execution-index.ts` | No root-scoped `listAgents`; same placement model as teams | Extend the org location service to mirror the team API | — |
| Code read | `agent-org-run-history-index-store.ts#readIndex` | Read-only row source | (SR-002 decision, **superseded in SR-004**: upstream `b68847a8c` made `AgentOrgRunHistoryCatalogService.listCatalogRows()` pure, so the org source now uses the owner) | — |
| Code read | `collaboration-execution-location-service.ts` | "Collaboration" is the codebase's name for the team+org families | Shared core naming | — |
| Node scan | `memory/agent_orgs` | 4 org definitions, 19 runs with member memory; 5 runs with task executions | AC-007 expectations; REQ-010 matters for orgs | — |
| Code read | `memory-sync-path-policy.ts` | Orgs are not synced | Imported source → org empty state (out of scope) | — |

## Intended Change

1. **Backend: one shared, linear "collaboration root memory catalog".** A single catalog core owns iteration, member memory availability, grouping by definition, sorting, search and paging. It is fed by one **source** per persistence family: team and org. Each source reads a root's execution tree exactly once through its family's location service and returns neutral member locations. The team explorer is refactored onto the core, which removes the N² path. A new org explorer uses the same core.
2. **Backend: org GraphQL surface.** Add `listAgentOrgsWithMemory`, `listAgentOrgRunsWithMemory` and `getAgentOrgMemberRunMemoryView`. The member-target type is shared across families.
3. **Backend: the location boundary.** `AgentMemoryLocationService` stays the single member-memory-location boundary for the inspector. Team resolution becomes root-scoped, org resolution is added, and the unused list API is removed.
4. **Frontend: the route owns data loading.** Click handlers only navigate. The route sync performs exactly one fetch per view and resets detail lists when the selection identity changes.
5. **Frontend: Agent Orgs.** Add a third home tab, an org detail view and an org inspector target. Team and org detail share one presentational component, which also fixes the member name.
6. **(SR-004) Every agent run in its structure (REQ-012).** Member targets cover all agent executions in the execution tree that have memory and carry `executionKind` + `groupPath`; the detail renders them as a tree.
7. **(SR-004) Sources list ownership (REQ-011).** The store owns the sources list; the route sync never requests it for detail/inspector navigation; the home view refreshes it in the background.
8. **(SR-004) Upstream integration (CR-004).** Merge `origin/personal`; the org source reads org history through `AgentOrgRunHistoryCatalogService.listCatalogRows()`.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Requirement / AC IDs | Approved Trigger | Existing Behavior & Evidence | Approved Change / Preserved Outcome | Target Production Path & Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-001, REQ-004; AC-001, AC-003, AC-005 | Memory → Agent Teams tab | 31.8 s | Linear, ≤ 2 s; same content | DS-001 |
| BEH-002 | User | REQ-001…004; AC-002…005 | Team card click | Fetch, navigate, fetch again | Navigate immediately, one fetch, loading state | DS-004 → DS-001 |
| BEH-003 | User | REQ-002, REQ-005; AC-004, AC-006 | Member/run click | Double fetch; whole-store scan | One fetch; root-scoped resolution | DS-004 → DS-003 |
| BEH-004 | User | REQ-003; AC-004 | Switch selection | Stale runs visible | List reset on identity change | DS-004 |
| BEH-005 | System | REQ-004; AC-005 | All team queries | Correct content | Identical to the `589005470` baseline apart from REQ-009, REQ-010 and REQ-012 | DS-001, DS-005 |
| BEH-006 | User | REQ-006, REQ-008; AC-003, AC-007 | Memory → Agent Orgs tab | No current supported behavior | Org definition cards | DS-002 |
| BEH-007 | User | REQ-007, REQ-008; AC-008, AC-009 | Org card / org member click | No current supported behavior | Org detail and inspector | DS-004 → DS-002 / DS-003 |
| BEH-008 | User | REQ-009; AC-010 | Open a team/org detail | Blank member name | Member name shown | DS-004 (shared detail component) |
| BEH-009 | User | REQ-010; AC-011 | Open a detail with task instances | Configured run ID shown for a task run | Own run ID | DS-005 |
| BEH-010 | User | REQ-012, REQ-004; AC-014, AC-003, AC-005 | Open a team/org detail whose run delegated tasks | Task executions flat or hidden, no structure | Every agent run with memory, in its execution structure (tree); flat teams unchanged | DS-005 (projection) → DS-001/002 → DS-004 (tree render) |
| BEH-002/003 (REQ-011) | User | REQ-011, REQ-002, REQ-003; AC-012, AC-013 | Any Memory navigation; Memory home shown | Sources list requested and awaited on every route change | No sources request on detail/inspector navigation; background refresh on home; one awaited load only for an unknown imported key | DS-004 |

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


## SR-004 Revision (authoritative deltas over SR-003)

Scope was limited at the user's direction: "we are not going for a huge refactoring … only … a scoped refactoring". SR-004 contains only (1) showing all agent runs in their execution structure (REQ-012, user direction; replaces the F-001 exclusion), (2) the CR-002 source-list ownership in the frontend route sync and (3) the CR-004 integration of `origin/personal`. The catalog core, the existing GraphQL queries (only additive member-target fields), the Agent Orgs screens and the location-boundary design are otherwise unchanged. Evidence: investigation notes → "SR-004 Investigation", "F-001", "CR-004".

### Delta 1: show every agent run in its execution structure (REQ-012 / AC-014; supersedes F-001's exclusion)

- **Rule:** a member target is **every agent execution in the run's execution tree whose own run directory has memory**, whatever its kind: `configured`, `task` or `task_team_member`, at any depth. The execution tree is the only authority (DEC-004). Memory directories the tree does not reference are never shown, and there is no directory scan.
- **Structure carried per member (additive contract):** `CollaborationMemberMemoryTargetSummary` gains
  - `executionKind: CONFIGURED | TASK_AGENT | TASK_TEAM_MEMBER`;
  - `groupPath: [CollaborationMemoryGroup]`, ordered outermost → innermost, with `CollaborationMemoryGroup { teamRunId, address, displayName, kind: CONFIGURED_TEAM | TASK_TEAM, startedAt (nullable) }`;
  - for a task agent: `startedAt`.
  
  The root team or org itself is never a group. A flat list with group paths keeps search, counts and paging unchanged while fully describing the tree.
- **Source derivation (one tree read, no extra I/O):**
  - `LocatedTeamAgentExecution` and `LocatedAgentOrgAgentExecution` gain `executionKind` and `groupPath`.
  - They are derived from the index each location service already builds: `TeamExecutionIndex.listContainingTeamAncestorsForAgent`, or `AgentOrgExecutionIndex.listTeamAncestorsDeepestFirst` over the agent's host team, reversed and excluding the root. `IndexedTeamExecution.executionKind` maps `configured` → `CONFIGURED_TEAM` and `task` / `task_team_member` → `TASK_TEAM`.
  - The sources no longer filter by kind or placement. **Remove** `configuredOnly` from `TeamRunExecutionTreeLocationService.listAgents` (its only caller was the team source).
  - `agentDefinitionId` = the configured placement's ID when one exists for the address, else `null`.
  - `displayName` is unchanged (team: address basename; org: address path).
- **Order (REC-005; preserves REQ-004 for flat teams):** depth-first with contiguous groups. At each level (the root, then each group): (1) the level's agents, ordered by `displayName`, ties broken by kind (configured, then task agents by `startedAt`, then task-team members); (2) configured child teams in tree order; (3) task child teams by `startedAt`, and nested teams without `startedAt` in tree order. A team without task executions or configured sub-teams therefore keeps today's order exactly. `CollaborationMemoryGroup.startedAt` is nullable (configured teams and nested teams inside task teams have none).
- **Frontend:** `CollaborationMemoryDetail.vue` renders each run's members as a tree built from `groupPath`, grouping by `groupPath[].teamRunId` and **never by address** (REC-006: in AC-014 the task team shares the address `/StudentStudyGroup` with the configured team): group header rows plus agent rows with indentation. It reuses the run-history sidebar's visual language (`WorkspaceHierarchyBranches`-style branches; dashed indigo styling for task rows, as in `WorkspaceTransientExecutionRow.vue`). Task groups and task agents show "task" and their start time. Group headers are not clickable, and every agent row emits `inspectMember` for its own `agentRunId`. The component stays presentational (REC-002).
- **Inspector:** unchanged. `resolveTeamMemberLocation` and `resolveAgentOrgMemberLocation` already resolve any agent run in the tree by `agentRunId`.
- **Search:** member matching (`displayName`, address, own run ID, definition ID) now also covers task agents and task-team members. This follows directly from REQ-012.
- **Tests:**
  - Admitted fixtures in `team-memory-explorer-service.test.ts` and `agent-org-memory-explorer-service.test.ts`: a configured team, a task agent, a task team delegated to a configured team address, and a nested team inside a task team. Assert all agent runs are listed with the correct `executionKind`, `groupPath` and order.
  - A flat team is ordered as before.
  - Component test for the tree rendering and header rows.
  - API/E2E `memory-collaboration-graphql.e2e.test.ts`: the "…excludes task-team members…" case becomes "…includes task-team members under their task group…".
- **REQ-004 effect on real data:** only runs with task executions can change (they gain rows and the derived aggregates). Real team data: 1 run has task-agent memory; that task agent was already listed and aggregated at the baseline, and 0 team runs have task teams, so team output differs only by REQ-009/010. Real org data: 15 task teams with 30 members gain rows.

### Delta 2: sources list ownership in the frontend route sync (CR-002, REQ-011 / AC-012 / AC-013; subsumes CR-001)

- **Current:** `syncRouteState` runs `selectRouteSubject()` → `await syncRouteSource()` (a network sources query on every route change) → `selectRouteSubject()` again → one data fetch. `loadSources()` also silently moves `selectedSource` when the list changes.
- **Target ownership:**
  - `memoryExplorerStore` owns the **sources list** as page-lifetime state:
    - `sources`, `sourcesLoaded`, `sourceError`, `sourceLoading`.
    - `loadSources()` only replaces the list. It never changes `selectedSource`. On failure it keeps the previous list (or `[local]` if nothing was ever loaded) and sets `sourceError`.
    - Concurrent calls share one in-flight promise.
  - `pages/memory.vue` stays the single owner of **route → selection → fetch**. The source selection is derived from the route key against the loaded list (`setSelectedSourceByKey`, unchanged).
- **Target route sync:**
  ```ts
  async function syncRouteState() {
    const key = routeSourceKey();                                   // 'local' | 'imported:<id>'
    if (key !== 'local' && !explorerStore.hasSource(key)) {
      await explorerStore.loadSources();                             // once; only for an unknown imported key
      if (!explorerStore.hasSource(key)) {                           // still unknown → current fallback behavior
        await router.replace({ path: '/memory', query: cleanQuery({ ...route.query, source: undefined }) });
        return;                                                      // the replace triggers the next sync
      }
    }
    explorerStore.setSelectedSourceByKey(key);
    selectRouteSubject();                                            // exactly once
    // RULE: no `await` between selectRouteSubject() and the fetch start below
    if (currentView.value === 'home') {
      inspectorStore.clear();
      void refreshSourcesForHome();                                  // background; never awaited
      await explorerStore.fetchHomeTab(routeHomeTab());
      return;
    }
    // detail / inspector branches unchanged: one fetch or inspect, and no sources request
  }
  async function refreshSourcesForHome() {
    await explorerStore.loadSources();
    const key = routeSourceKey();
    if (currentView.value === 'home' && key !== 'local' && !explorerStore.hasSource(key)) {
      await router.replace({ path: '/memory', query: cleanQuery({ ...route.query, source: undefined }) });
    }
  }
  ```
- **Why CR-001 disappears by construction:** `resetList` (selection change) and `fetchList` (which sets `loading = true` synchronously before its first `await`) now run in the same synchronous segment, so no render can show "No runs match this filter" first.
- **Removals:**
  - `syncRouteSource()`;
  - the first (pre-load) `selectRouteSubject()` call and its comment;
  - the "re-apply after source change" second call;
  - `loadSources()`'s `selectedSource` mutation;
  - the page test "applies the routed team selection before the memory sources load" (replaced below).
- **Store API added:** `hasSource(key): boolean` (getter-style action) and `sourcesLoaded`. Nothing else in the store changes.
- **Tests:**
  - `pages/__tests__/memory.spec.ts`:
    - (a) a card, run, member or Back click sends exactly one request and **no** `ListMemoryExplorerSources` (AC-012);
    - (b) the first render after a new team/org selection shows "Loading runs…" and never the empty state;
    - (c) home view: the sources refresh runs, and the home list request is not delayed by it (resolve the sources promise after the list) (AC-013);
    - (d) an unknown imported key leads to one awaited sources request, then a replace to Local.
  - `tests/stores/memoryExplorerStore.test.ts`: `loadSources` does not change `selectedSource`; a failure keeps the previous list; concurrent calls are deduped.

### Delta 3: integrate origin/personal @ `589005470` (CR-004; CR-003 resolved upstream)

- **Merge direction:** merge `origin/personal` into `codex/memory-team-view-slow-load`. On conflicts **this branch's structure wins**: `CollaborationRootMemoryCatalog` + family sources + `CollaborationMemberMemoryTarget`. Take upstream's run-history changes (`b68847a8c`) in full.
- **Conflict resolution rules:**

  | Upstream artifact | Resolution | Reason |
  | --- | --- | --- |
  | `team-memory-member-target-builder.ts` (`buildFromTree`) | Stays **deleted** | Replaced by `collaboration-member-memory-targets.ts` + `TeamRootMemorySource` |
  | `team-memory-explorer-service.ts` (upstream `safeReadTree` mismatch check, `buildFromTree` call) | Take **this branch's** facade | The catalog's skip rule plus schema validation cover the mismatch (see below) |
  | `AgentMemoryLocationService.listTeamMemberLocationsFromTree` | **Remove** | No production caller after the merge (clean cut, same as `listTeamMemberLocations`) |
  | `TeamRunExecutionTreeLocationService.listAgentsInTree` | **Remove** | No production caller; the sources use root-scoped `listAgents` (one read) |
  | Upstream test "projects … from the already-read tree" (`agent-memory-location-service.test.ts`) | **Remove** with its API | Its invariants (one read, root match) are asserted at the explorer level below |
  | Upstream test "uses one read per admitted root … leaves all files unchanged" (`team-memory-explorer-service.test.ts`) | **Keep**, adapted to this branch's facade | Same guarantee as AC-003, plus no writes |
  | Manager hook rename | `TeamRootMemorySource`'s stored-only manager implements `withInactiveHistoryMutation` (drop `withUnmanagedHistoryDeletion`) | Upstream contract |
- **Root/tree-ID mismatch invariant:** already enforced. `listAgents({rootTeamRunId: id})` → `readStoredTree(id)` → `TeamRunExecutionTreeStore.read(dir, id)` → `validateTeamRunExecutionTreePayload(value, id)` throws on a mismatch (`team-run-execution-tree-schema.ts:94`). The same applies to orgs (`agent-org-run-execution-tree-schema.ts:103`). The catalog then warns and skips that root. **Add** a test in `team-memory-explorer-service.test.ts`: a root folder whose tree names a different `teamRunId` is skipped, and the other roots list.
- **Org history owner (CR-003's in-package half):** `AgentOrgRootMemorySource.readCatalogEntries()` reads `AgentOrgRunHistoryCatalogService.listCatalogRows()` (pure, admission-filtered, compactSummary'd). It no longer reads `AgentOrgRunHistoryIndexStore.readIndex()` directly. It is constructed with a module-level stored-only `InactiveHistoryManager` (`withInactiveHistoryMutation` → run the operation, `{ kind: "completed", value }`), mirroring the team source. Empty-summary → `null` normalization is kept. **Dependency rule update:** the org source depends on `AgentOrgRunHistoryCatalogService` (the owner), not the index store. This replaces the SR-002 rule "the org explorer must not use `AgentOrgRunHistoryCatalogService`", which only existed because of the upstream side effect that is now removed.
- **Codegen:** rerun web GraphQL codegen against the merged backend schema, because upstream removed external-messaging schema. The memory types must be unchanged apart from this package's additions.
- **Catalog read order (REC-007):** keep `readCatalogEntries()` before `listRootRunIds()`/`readRoot()` through the merge, so both use the same admission state (AR-P-002).
- **Re-validation gate:** baseline = the **team explorer output of `origin/personal` @ `589005470`** (not `40b1783f4`; upstream now compacts team summaries in `listCatalogRows()`), on the same frozen, mtime-preserving copy of the user's memory. Compare the team list, SE runs and team searches. Allowed differences: REQ-009 (names), REQ-010 (own run ID and search matching on it) and the REQ-012 additions with their derived aggregates (on real team data this is expected to be none beyond REQ-009/010). O-001 (admission counts on the built server) stays with API/E2E.

### SR-004 change sequence

1. Merge `origin/personal` @ `589005470` (or a newer tip) and apply the Delta 3 resolution table. Preserve the untracked ticket artifacts and `tests/e2e/memory/memory-collaboration-graphql.e2e.test.ts`. Delete `autobyteus-server-ts/tests/probe-tmp/` if it is not the implementer's.
2. Delta 1: backend (`executionKind` + `groupPath` on located executions and member targets, remove `configuredOnly`, GraphQL fields), then the tree rendering in `CollaborationMemoryDetail.vue`, then fixtures and tests.
3. Delta 3 org source → the history owner; add the mismatch test; codegen.
4. Delta 2 frontend route sync and store.
5. Server and web suites; the equivalence gate; hand off to source review, then API/E2E.

### SR-004 classification

- Package classification: `task_size=Large`, `architectural_risk=High`, unchanged (the cumulative package; the code reviewer concurs).
- SR-004 delta on its own: about 10 source files plus tests. It includes a merge with certain conflicts and a public location-API and additive GraphQL contract change (`executionKind`/`groupPath` added, `configuredOnly` / `listAgentsInTree` / `listTeamMemberLocationsFromTree` removed). This supports keeping `High`.

## Terminology

- **Collaboration root**: a root team run (`agent_teams/<id>`) or root org run (`agent_orgs/<id>`).
- **Family source**: the adapter that reads one persistence family for the memory catalog.
- **Member memory location**: one agent execution inside a root's execution tree, of any kind (configured, task agent, task-team member), identified by its **own** `agentRunId`, and carrying its `executionKind` and `groupPath` (SR-004).
- **Group**: a configured team or task team inside the root on the path to a member (`groupPath`); the root itself is never a group.

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
| DS-004 | A click only pushes a route. The watcher runs `syncRouteState`: select the source by key from the already-loaded list (awaiting one sources load only for an unknown imported key), apply the routed subject once (resetting the list if the identity changed), then exactly one fetch with no `await` in between. On the home view, a background sources refresh runs in parallel. | Page, stores | `pages/memory.vue` | Sources list (store) |
| DS-005 | `entries = source.readCatalogEntries()` (first, REC-007) → `for rootId of source.listRootRunIds(): record = source.readRoot(rootId)` (skip with a warning on error) → `targets = buildCollaborationMemberMemoryTargets(record.members)` → skip if empty → group by `definitionId` and resolve the name from the catalog entry → summaries | Catalog | Catalog | Member target builder |

## Spine Actors / Main-Line Nodes

Route sync (`pages/memory.vue`); `memoryExplorerStore` and `memoryInspectorStore`; `MemoryExplorerResolver` and `MemoryViewResolver`; `TeamMemoryExplorerService` and `AgentOrgMemoryExplorerService`; `CollaborationRootMemoryCatalog`; `TeamRootMemorySource` and `AgentOrgRootMemorySource`; `AgentMemoryLocationService`; `AgentMemoryService`.

## Ownership Map

- `pages/memory.vue`: owns the mapping between route and view and is the **single fetch trigger** for route-driven views. It owns no data.
- `memoryExplorerStore`: owns list state (entries, paging, search, loading, error, requestId) per subject: agents, agentRuns, teams, teamRuns, orgs, orgRuns. It also owns the selection identity and resets a list when the identity changes. (SR-004) It owns the page-lifetime **sources list** (`sources`, `sourcesLoaded`, `sourceLoading`, `sourceError`, deduped `loadSources()` that never changes `selectedSource`, `hasSource(key)`).
- `memoryInspectorStore`: owns the inspector target, the memory view, and which view query to use for each target kind.
- `CollaborationMemoryDetail.vue`: presentational only. It renders a run list with each run's member tree (built from `groupPath`, grouped by `teamRunId`) and emits user intents.
- `MemoryExplorerResolver` / `MemoryViewResolver`: transport. They resolve the source (local/imported), construct the service and return DTOs.
- `TeamMemoryExplorerService` / `AgentOrgMemoryExplorerService`: the subject-specific public explorer boundary. Each owns the mapping from neutral catalog records to subject DTOs (team or org field names) and constructs its family source.
- `CollaborationRootMemoryCatalog`: owns catalog **policy**, meaning iteration, the skip-invalid-root rule, filtering members to those with memory, group-name resolution, merged availability, sort order, search matching and paging.
- `TeamRootMemorySource` / `AgentOrgRootMemorySource`: own family-specific **reading**. That covers root IDs, one tree read per root, projecting **every** agent execution with its `executionKind` and `groupPath` (REQ-012), the display label, and catalog entries through the family's history owner (`TeamRunHistoryCatalogService.listCatalogRows()` / `AgentOrgRunHistoryCatalogService.listCatalogRows()`).
- `buildCollaborationMemberMemoryTargets`: owns per-member memory availability (file stats).
- `AgentMemoryLocationService`: the authoritative member-memory-location resolver for inspection (team and org).
- `AgentOrgExecutionTreeLocationService` / `TeamRunExecutionTreeLocationService`: own tree reading and location projection (including `executionKind` and `groupPath` from their indexes) and admission checks.

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
| (SR-004) `configuredOnly` option of `TeamRunExecutionTreeLocationService.listAgents` | REQ-012 lists all executions; its only caller was the team source | Sources take all located executions | In This Change | — |
| (SR-004) Upstream `AgentMemoryLocationService.listTeamMemberLocationsFromTree` + its test | No production caller after the merge | `TeamRootMemorySource.readRoot` (one read) | In This Change | Merge resolution |
| (SR-004) Upstream `TeamRunExecutionTreeLocationService.listAgentsInTree` | No production caller after the merge | Root-scoped `listAgents` | In This Change | Merge resolution |
| (SR-004) Upstream `TeamMemoryMemberTargetBuilder.buildFromTree` (file) | Replaced by this branch's structure | `collaboration-member-memory-targets.ts` | In This Change | Stays deleted through the merge |
| (SR-004) `AgentOrgRootMemorySource`'s direct `AgentOrgRunHistoryIndexStore.readIndex()` dependency | The history owner now has a pure read | `AgentOrgRunHistoryCatalogService.listCatalogRows()` | In This Change | — |
| (SR-004) Stored-only manager `withUnmanagedHistoryDeletion` in `TeamRootMemorySource` | Upstream renamed the contract | `withInactiveHistoryMutation` | In This Change | — |
| (SR-004) `pages/memory.vue#syncRouteSource`, the pre-load and repeated `selectRouteSubject()` calls, and `loadSources()`'s `selectedSource` mutation | Sources are page-lifetime state | Delta 2 route sync + store sources ownership | In This Change | Also the page test "applies the routed team selection before the memory sources load" |

## Return Or Event Spine(s) (If Applicable)

N/A. These are request/response queries.

## Bounded Local / Internal Spines (If Applicable)

- DS-004, parent owner `pages/memory.vue`: `click → router.push(query) → watch(route.fullPath) → syncRouteState → [unknown imported key only: await loadSources() once; still unknown → replace to Local] → setSelectedSourceByKey → selectRouteSubject() once (reset if identity changed) → one fetch* / inspect (no await in between) → render`; on the home view additionally `void refreshSourcesForHome()` in the background.
- DS-005, parent owner `CollaborationRootMemoryCatalog`: `readCatalogEntries (first; REC-007) → listRootRunIds → readRoot (1 tree read; on throw: warn + skip) → buildCollaborationMemberMemoryTargets → drop root if no targets → group → merge → sort → filter → page`.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| `buildCollaborationMemberMemoryTargets` | DS-001/002/005 | Catalog | Memory availability per member location; drops members without memory; orders members by the structural order (SR-004 Delta 1, REC-005) | Shared by both families | In a source it would duplicate; in the catalog it would bloat the file |
| `memory-explorer-page.ts` (existing) | DS-001/002 | Catalog | Search normalization, `includes`, paging | Existing utility | — |
| `MemoryRunSummaryBuilder` (existing) | DS-005 | Member target builder | File stats → availability | Existing | — |
| Catalog entries (team `TeamRunHistoryCatalogService.listCatalogRows`, org `AgentOrgRunHistoryCatalogService.listCatalogRows`; both pure at `589005470`) | DS-001/002 | Family sources | Summary, workspace, createdAt and name per root | Family-owned history | Reading them in the catalog would couple it to both families |
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

- Allowed: `api/graphql/types/memory-explorer.ts → *MemoryExplorerService → CollaborationRootMemoryCatalog → CollaborationRootMemorySource (interface)`; `TeamRootMemorySource → run-history (TeamRunExecutionTreeLocationService, TeamRunHistoryCatalogService)`; `AgentOrgRootMemorySource → agent-org-execution (AgentOrgExecutionTreeLocationService) + run-history (AgentOrgRunHistoryCatalogService, via its pure `listCatalogRows()`)`; `memory-view.ts → AgentMemoryLocationService, AgentMemoryService`.
- Forbidden: the catalog importing any team or org module; a source importing `AgentMemoryLocationService`; resolvers importing sources or tree location services; a family source reading its history **index store** directly instead of the history owner (`AgentOrgRunHistoryIndexStore`, `TeamRunHistoryIndexStore`); a family source calling any history mutation or repair API; any web click handler calling a store fetch or `inspectorStore.inspect` directly; `pages/memory.vue` awaiting a sources request on detail or inspector navigation; `CollaborationMemoryDetail.vue` importing a store.

## Interface Boundary Mapping

| Interface / API / Query / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| GraphQL `listAgentTeamsWithMemory` / `listAgentTeamRunsWithMemory` | Team definitions / team runs | Unchanged signatures | `teamDefinitionId` | `memberTargets` type renamed |
| GraphQL `listAgentOrgsWithMemory(source, search, page, pageSize): AgentOrgWithMemoryPage` | Org definitions | New | — | Entries `{orgDefinitionId, orgDefinitionName, orgRunCount, memberMemoryCount, latestMemoryAt, memory}` |
| GraphQL `listAgentOrgRunsWithMemory(orgDefinitionId!, source, search, page, pageSize): AgentOrgRunMemoryPage` | Org runs of one definition | New | `orgDefinitionId` | Entries `{orgRunId, orgDefinitionId, orgDefinitionName, summary, workspaceRootPath, createdAt, lastUpdatedAt, memory, memberTargets}` |
| GraphQL `getAgentOrgMemberRunMemoryView(orgRunId!, agentRunId!, source, include*…, rawTraceLimit, rawTraceFileName): AgentMemoryView` | One org member run's memory | New; same options as the team variant | `(orgRunId, agentRunId)` compound | Not found → `{ runId: agentRunId }` empty view (same as the team variant) |
| GraphQL type `CollaborationMemberMemoryTargetSummary` | Member target | `{memberAddress, displayName, agentRunId, agentDefinitionId, lastUpdatedAt, memory}` + (SR-004, additive) `executionKind: CONFIGURED \| TASK_AGENT \| TASK_TEAM_MEMBER`, `startedAt: String` (nullable; task agents only), `groupPath: [CollaborationMemoryGroup!]!` | `agentRunId` = the member execution's own run | Replaces `TeamMemberMemoryTargetSummary` |
| GraphQL type `CollaborationMemoryGroup` (SR-004) | One group on a member's path | `{teamRunId, address, displayName, kind: CONFIGURED_TEAM \| TASK_TEAM, startedAt: String (nullable)}` | `teamRunId` (group identity; addresses may repeat, REC-006) | Root is never a group |
| `CollaborationRootMemorySource.listRootRunIds(): Promise<string[]>` | Family roots | Admitted stored root IDs | — | — |
| `CollaborationRootMemorySource.readRoot(rootRunId): Promise<CollaborationRootMemoryRecord \| null>` | One root | Exactly one tree read; `null` when missing; throws when invalid | root run ID | — |
| `CollaborationRootMemorySource.readCatalogEntries(): Promise<ReadonlyMap<string, CollaborationRootCatalogEntry>>` | Family history | Read-only | — | May throw; the catalog warns and uses an empty map |
| `CollaborationRootMemoryCatalog.listDefinitions(search, page, pageSize)` / `.listRuns(definitionId, search, page, pageSize)` | Neutral catalog | Policy | `definitionId` | — |
| `AgentOrgExecutionTreeLocationService.listAgents(input?: { rootRunId?: string \| null })` | Org agent executions | Root-scoped when `rootRunId` is given (one tree; admission checked); all roots otherwise (unchanged) | root run ID | Mirrors team `listAgents({rootTeamRunId})` |
| `AgentOrgExecutionTreeLocationService.listRootRunIds()` | Org roots | Public form of the former private `listRootIds` | — | — |
| `TeamRunExecutionTreeLocationService.listAgents({rootTeamRunId?, containingTeamRunId?})` (SR-004) | Team agent executions | `configuredOnly` removed; located entries carry `executionKind` and `groupPath` | root run ID | Org `listAgents` located entries carry the same two fields |
| `memoryExplorerStore.loadSources()` / `hasSource(key)` (SR-004) | Sources list | Replace the list only (deduped in-flight); membership check | source key | Never mutates `selectedSource` |
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
| Team tree read + locations | `TeamRunExecutionTreeLocationService.listAgents({rootTeamRunId})` | Extend | Root-scoped already; SR-004 adds `executionKind`/`groupPath` to located entries and removes `configuredOnly` | — |
| Org tree read + locations | `AgentOrgExecutionTreeLocationService` | Extend | Needs a root-scoped list and public root IDs | — |
| Org history rows | `AgentOrgRunHistoryCatalogService.listCatalogRows` (pure since `b68847a8c`) | Reuse | The history owner; admission-filtered, no writes | — |
| Structural projection (kind, ancestors) | `TeamExecutionIndex` / `AgentOrgExecutionIndex` | Reuse | Already index `executionKind` and parent chains | — |
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
| `CollaborationMemberMemoryLocation {memberAddress, displayName, agentRunId, agentDefinitionId, memoryDir, executionKind, startedAt, groupPath}` | Yes; `agentRunId` is always the execution's own run; `groupPath` excludes the root | Yes | Low | — |
| `CollaborationRootMemoryRecord {rootRunId, definitionId, definitionName, createdAt, members}` | Yes; name and createdAt come from the tree | Yes | Low | — |
| `CollaborationRootCatalogEntry {definitionName, summary, workspaceRootPath, createdAt}` | Yes; all nullable and history-sourced | Yes | Low | Normalize empty org `summary` to `null` |
| Neutral run output `CollaborationRootRunMemory {rootRunId, definitionId, definitionName, summary, workspaceRootPath, createdAt, memory: MemoryAvailabilityBuildResult, members: CollaborationMemberMemoryTarget[]}` | Yes | Yes | Low | — |
| Web `CollaborationRunMemoryRow {runId, summary, workspaceRootPath, lastUpdatedAt, memory, memberTargets}` | Yes | Yes | Low | Built by page computeds from team/org entries |

## Final File Responsibility Mapping

| File | Owning Subsystem | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `server/src/agent-memory/services/collaboration-root-memory-catalog.ts` (Add) | agent-memory | Catalog | Source interface + neutral types + catalog policy (DS-005) | One policy owner | page utils, member targets |
| `server/src/agent-memory/services/collaboration-member-memory-targets.ts` (Add) | agent-memory | Off-spine | `CollaborationMemberMemoryLocation`, `CollaborationMemberMemoryTarget`, `buildCollaborationMemberMemoryTargets` | Single concern | `MemoryRunSummaryBuilder` |
| `server/src/agent-memory/services/team-root-memory-source.ts` (Add) | agent-memory | Team source | Team roots, one read per root, all agent executions with `executionKind`/`groupPath`, basename label, team catalog rows (history owner) | Family reading | Yes |
| `server/src/agent-memory/services/agent-org-root-memory-source.ts` (Add) | agent-memory | Org source | Org roots, one read per root, all agent executions with `executionKind`/`groupPath`, address-path label, org catalog rows via `AgentOrgRunHistoryCatalogService.listCatalogRows()` with a stored-only `withInactiveHistoryMutation` manager | Family reading | Yes |
| `server/src/agent-memory/services/team-memory-explorer-service.ts` (Modify) | agent-memory | Team facade | Catalog → team DTOs | Subject mapping | Yes |
| `server/src/agent-memory/services/agent-org-memory-explorer-service.ts` (Add) | agent-memory | Org facade | Catalog → org DTOs | Subject mapping | Yes |
| `server/src/agent-memory/services/team-memory-member-target-builder.ts` (Remove) | — | — | — | — | — |
| `server/src/agent-memory/services/agent-memory-location-service.ts` (Modify) | agent-memory | Location boundary | Remove `listTeamMemberLocations`; root-first `resolveTeamMemberLocation`; add `resolveAgentOrgMemberLocation`; accept `orgLocationService` | Existing owner | — |
| `server/src/agent-memory/domain/agent-memory-location.ts` (Modify) | agent-memory | Domain | Add `AgentOrgMemberAgentMemoryLocation {kind:"agent_org_member", orgRunId, ancestorTeamRunIds, memberAddress, agentRunId, configuredPlacement, memoryDir}`; add it to the union | Domain types | — |
| `server/src/agent-memory/domain/models.ts` (Modify) | agent-memory | Domain | Rename the member target type; add `AgentOrgWithMemorySummary`, `AgentOrgRunMemorySummary` | Domain types | — |
| `server/src/agent-org-execution/services/agent-org-execution-tree-location-service.ts` (Modify) | agent-org-execution | Org locations | `listAgents({rootRunId})`, public `listRootRunIds()`; (SR-004) located entries gain `executionKind`, `groupPath` | Existing owner | — |
| `server/src/run-history/services/team-run-execution-tree-location-service.ts` (Modify, SR-004) | run-history | Team locations | Located entries gain `executionKind`, `groupPath`; remove `configuredOnly`; upstream `listAgentsInTree` removed in the merge | Existing owner | — |
| `server/src/api/graphql/types/memory-explorer-schema.ts` (Modify) | api | Schema | Rename the member type; add the 4 org types; (SR-004) `executionKind`, `startedAt`, `groupPath`, `CollaborationMemoryGroup` | Schema | — |
| `server/src/api/graphql/types/memory-explorer.ts` (Modify) | api | Resolver | Add the 2 org queries | Transport | — |
| `server/src/api/graphql/types/memory-view.ts` (Modify) | api | Resolver | Add `getAgentOrgMemberRunMemoryView`; extract `readMemberRunMemoryView` | Transport | — |
| `web/types/memory.ts` (Modify) | web | Types | `CollaborationMemberMemoryTargetSummary`; org summaries; `org_member_run` inspect target | Types | — |
| `web/graphql/queries/memoryExplorerQueries.ts` (Modify) | web | Queries | Add `LIST_AGENT_ORGS_WITH_MEMORY`, `LIST_AGENT_ORG_RUNS_WITH_MEMORY` | Queries | — |
| `web/graphql/queries/memoryViewQueries.ts` (Modify) | web | Queries | Add `GET_AGENT_ORG_MEMBER_RUN_MEMORY_VIEW` | Queries | — |
| `web/generated/graphql.ts` (Regenerate) | web | Codegen | — | Generated | — |
| `web/stores/memoryExplorerStore.ts` (Modify) | web | Explorer state | `orgs`/`orgRuns`/`selectedOrg`; org actions; `homeTab` gains `'orgs'`; identity-change reset in `setSelected*FromRoute`; remove `open*Memory`; (SR-004) sources-list ownership (`sourcesLoaded`, deduped `loadSources`, `hasSource`) | State owner | — |
| `web/stores/memoryInspectorStore.ts` (Modify) | web | Inspector state | Query and variables per kind, including `org_member_run`; `sameTarget` for org | State owner | — |
| `web/components/memory/CollaborationMemoryDetail.vue` (Add) | web | Presentational | Header, back, search, runs with their member tree (group header rows keyed by `teamRunId`; agent rows with `displayName` + `agentRunId`; task rows styled like the run-history sidebar with start time), states, paging. **Contract (REC-002):** props `title`, `readOnly`, `rows: CollaborationRunMemoryRow[]`, `loading`, `error`, `page`, `totalPages`, `search`; emits `back`, `search(term)`, `retry`, `changePage(page)`, `inspectMember(runId, member)`. It **must not import any store**; `pages/memory.vue` routes the emits to the family's actions (`setTeamRunsSearch`/`setOrgRunsSearch`, `fetchTeamRuns`/`fetchOrgRuns`, `changeTeamRunsPage`/`changeOrgRunsPage`) | One view | — |
| `web/components/memory/AgentTeamMemoryDetail.vue` (Remove) | — | — | — | — | — |
| `web/components/memory/MemoryHome.vue` (Modify) | web | Home | Third tab, org cards, search, empty and retry states for orgs | Existing view | — |
| `web/components/memory/MemoryInspector.vue` (Modify) | web | Inspector | Breadcrumb/metadata for `org_member_run` | Existing view | — |
| `web/pages/memory.vue` (Modify) | web | Route sync | Views `org-detail` and `org-inspector`, tab `orgs`; handlers push only; single fetch in sync; team/org row computeds; back labels; (SR-004) Delta 2 route sync (`refreshSourcesForHome`; no sources request on detail/inspector navigation) | Route owner | — |
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
| One read per root | `readRoot(id)`: `const located = await teamLocations.listAgents({ rootTeamRunId: id }); if (!located.length) return null; const tree = located[0].tree; return { rootRunId: id, definitionId: tree.rootTeam.teamDefinitionId.trim(), definitionName: tree.rootTeam.teamDefinitionName, createdAt: tree.createdAt ?? null, members: located.map(toMember) }` | `readTree(id)` followed by `memoryLocationService.listTeamMemberLocations(id)`, which rescans every root | This is the root cause |
| Member identity | `toMember = (l) => ({ memberAddress: l.memberAddress, displayName: basename(l.memberAddress), agentRunId: l.agentRunId, agentDefinitionId: l.configuredPlacement?.agentDefinitionId ?? null, memoryDir: l.memoryDir, executionKind: l.executionKind, startedAt: l.startedAt, groupPath: l.groupPath })` | `agentRunId: l.configuredPlacement.agentRunId` | REQ-010 |
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

### ARCH-REV-003 (round 3) findings resolved in SR-004

| Finding | Where Resolved |
| --- | --- |
| AR-001 (requirements contradictions) | `requirements-doc.md`: Out of Scope, REQ-004/AC-005/BEH-005/Preserved boundary/Desired outcome exceptions, REQ-008 (only the member-selection sentence superseded), BEH-010 defined, traceability for REQ-011/012 and AC-012…014, DEC-003 status, approval confirmation for REQ-012's effect |
| AR-002 (base sections contradicted deltas) | Escalation trigger; Intended Change 6–8; behavior map (BEH-010, REQ-011 row); Terminology; DS-004/DS-005 narratives and bounded spines; Ownership Map; Removal plan (SR-004 rows); Off-spine; Dependency Rules; Interface mapping; Reuse; Tightness; File mapping; Examples; Tradeoffs; Guidance; re-validation baseline `589005470` |
| REC-005 (ordering) | Delta 1 "Order" |
| REC-006 (group by `teamRunId`) | Delta 1 "Frontend"; Interface mapping (`CollaborationMemoryGroup`) |
| REC-007 (entries before roots) | Delta 3 "Catalog read order"; DS-005 |

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

*(SR-002/003 sequence, implemented at `bd8450984`. The remaining work is the "SR-004 change sequence" above.)*

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
- **History rows through each family's history owner.** Since `b68847a8c` both `TeamRunHistoryCatalogService.listCatalogRows()` and `AgentOrgRunHistoryCatalogService.listCatalogRows()` are pure reads, so both sources depend on the owner (SR-004; the SR-002 index-store workaround is removed).
- **Flat member list + `groupPath` vs. a nested tree in GraphQL.** The flat list keeps search, counts and paging unchanged and keeps the contract additive; the frontend builds the tree.
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
  - New `agent-org-memory-explorer-service.test.ts`: definition grouping, org index name/summary, member address-path labels, configured-team member inclusion, (SR-004) task agents and task-team members **included** with correct `executionKind`/`groupPath`/order using admitted fixtures (task team delegated to a configured team), search, paging, missing catalog row → tree name.
  - `agent-memory-location-service.test.ts`: move the `listTeamMemberLocations` derivation assertions to `listAgents({rootTeamRunId})`; add root-scoped and nested-team-ID resolution and org resolution.
  - Org location service: `listAgents({rootRunId})` reads one tree and respects admission; `listRootRunIds`.
  - `memory-explorer-types.test.ts` and the memory-view resolver tests: the org queries and the renamed type.
- Web tests: `memoryExplorerStore.test.ts` (org fetch; identity reset; removed `openAgentMemory` test replaced by a route-selection test); `pages/__tests__/memory.spec.ts` (**exactly one** runs/view request per card, run or member click; org detail/inspector routing; back labels); `CollaborationMemoryDetail.spec.ts` (member `displayName` rendered, AC-010); `MemoryHome` org tab; inspector store org query and variables.
- Validation handoff: timing of the three list queries against the user's real memory dir (AC-001, AC-002, AC-007 ≤ 2 s) and a manual Electron walkthrough of SCN-001…SCN-006.
- Do not change the existing queries' names, arguments or field names; do not touch memory sync.
