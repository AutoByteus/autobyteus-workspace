# Investigation Notes

## Investigation Meta

- Package identifier: `memory-team-view-slow-load`
- Request / ticket: User report 2026-09-24 — "Memory → Agent Teams takes a long time to load; clicking a team card takes very, very long to open."
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-team-view-slow-load`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-team-view-slow-load` / `codex/memory-team-view-slow-load`
- Resolved base remote / branch / revision: `origin/personal`. Created at `1bb7bb1eb`; fast-forwarded on 2026-09-24 to `40b1783f4` (a docs-only commit)
- Finalization target remote / branch: `origin/personal`
- Bootstrap result: Worktree created from freshly fetched `origin/personal`.
- Bootstrap blocker: None.
- Current solution revision ID: `SR-004` (draft, awaiting approval)
- Investigation status: Root cause reproduced and confirmed with a probe on real data (SR-001). Architecture and Agent Org investigation complete (SR-002).

## Initial Request And Clarifications

- Original request: "After I click the agent teams, they spend a long time to load. After … being able to see the card, I click it and I have to wait so long until it is opened … You can actually try to reproduce … use the electron starting the backend server as a backend."
- Clarifications received: None needed. The screenshots show Memory page → `Local Memory` source → `Agent Teams` tab. Software Engineering Team shows 364 runs.
- User-supplied facts and constraints: The user suspects performance and is unsure whether it is memory-related. Reproduce against the Electron-launched backend.
- Initial ambiguity: None. The issue reproduced directly (see Runtime findings).

## Product And Domain Understanding

- Product area: Memory explorer (`/memory` page), Agent Teams tab and team detail (team runs list).
- Affected actors or systems: Desktop user; `autobyteus-web` memory page/stores; `autobyteus-server-ts` memory explorer GraphQL.
- Existing user or operational purpose: Browse stored team runs grouped by team definition, then inspect a member's memory.
- Relevant terminology: *Root team run*: a stored team run folder under `memory/agent_teams/<rootTeamRunId>/` with `team_run_execution_tree.json`. *Member target*: an agent run inside a team run with memory files.

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-09-24 | User | Two screenshots (Memory → Agents; Memory → Agent Teams) | Identify surface | Memory explorer, Local Memory, SE team 364 runs | — |
| 2026-09-24 | Code | `autobyteus-web/pages/memory.vue` | Click flow | `selectTeam` awaits `openTeamMemory` (fetch) **before** `router.push`; then the route watcher `syncRouteState` calls `loadSources` + `fetchTeamRuns` **again** | Double request on each card click |
| 2026-09-24 | Code | `autobyteus-web/stores/memoryExplorerStore.ts` | Fetch behavior | `fetchList` uses `network-only`; `openTeamMemory` does not clear previous `teamRuns.entries` | Stale entries risk |
| 2026-09-24 | Code | `autobyteus-web/components/memory/AgentTeamMemoryDetail.vue` | Loading UX | "Loading runs" shows only when `loading && entries.length === 0` | — |
| 2026-09-24 | Code | `autobyteus-server-ts/src/agent-memory/services/team-memory-explorer-service.ts` | Backend query | `listAgentTeamsWithMemory` and `listAgentTeamRunsWithMemory` both call `buildGroups()`, which loops over **all** root team runs, reads each tree, then calls `memberTargetBuilder.build(teamRunId)` | — |
| 2026-09-24 | Code | `.../team-memory-member-target-builder.ts` → `agent-memory-location-service.ts#listTeamMemberLocations` | Per-run member lookup | `listTeamMemberLocations` calls `locations.listAgents()` **with no root filter** → reads and validates **every** stored tree, then filters by team id | **O(N²) tree reads** — root cause |
| 2026-09-24 | Code | `.../run-history/services/team-run-execution-tree-location-service.ts` | Scan cost | `listAgents({rootTeamRunId})` already supports a root-scoped single-tree read; `readStoredTree` = readFile + JSON.parse + `validateTeamRunExecutionTreePayload` | Existing supported fix path |
| 2026-09-24 | Code | `agent-memory-location-service.ts#resolveTeamMemberLocation` (used by `memory-view.ts` inspector, skill-improvement, application orchestration) | Adjacent use | Also an unscoped full scan, but once per request (O(N), ~90 ms here) | Same scoping applies cheaply |
| 2026-09-24 | Data | `~/.autobyteus/server-data/memory/agent_teams` | Volume | 534 root dirs, 526 trees, 3.8 MB of tree JSON total, 6.0 GB total team memory | — |
| 2026-09-24 | Runtime | Electron backend `AutoByteus.app … dist/app.js --port 29695` via `curl` GraphQL | Reproduce | See Runtime table | — |
| 2026-09-24 | Command | Disposable vitest probe (deleted) using real `TeamMemoryExplorerService` against real memory dir, read-only | Confirm cause + candidate fix | See Runtime table | — |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger | Current Path / Lifecycle | Current Outcome | Evidence | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Memory page → click `Agent Teams` tab | Route push → `syncRouteState` → `listMemoryExplorerSources` + `listAgentTeamsWithMemory` | Team cards appear after ~32 s | curl 31.8 s | High |
| BEH-002 | User | Click a team card | `selectTeam` → awaits `listAgentTeamRunsWithMemory` (~32–40 s, page does not change) → `router.push` → `syncRouteState` → second `listAgentTeamRunsWithMemory` (~32–40 s, "Loading runs…") | Team detail usable after ~65–80 s | Code + curl 32.2 s + probe 40.2 s | High |
| BEH-003 | User | Click a member in the team detail | `inspectTeamMember` awaits `getTeamMemberRunMemoryView` → `router.push` → `syncRouteState` → `inspect` again | Double fetch; each ~0.1 s plus a full tree scan in `resolveTeamMemberLocation` | Code | High (minor cost) |
| BEH-004 | User | Agents tab / agent card | `listAgentsWithMemory` | 0.13 s — not affected by the team scan; same double-fetch-on-click pattern in `selectAgent`/`inspectAgentRun` | curl | High |
| BEH-005 | System | Returned content | Team grouping, run counts, member targets, memory badges, sort order, paging, search | Correct content, only slow | Probe equivalence | High |

## Relevant Codebase And Technical Facts

| Path / Component | Current Responsibility | Requirement Implication | Design Implication |
| --- | --- | --- | --- |
| `team-memory-explorer-service.ts#buildGroups` | Builds all team groups for both queries | Must preserve output exactly | Already reads each root tree once |
| `agent-memory-location-service.ts#listTeamMemberLocations` | Members for one team run id (root/containing/ancestor match) | — | Unscoped `listAgents()` → N² |
| `team-run-execution-tree-location-service.ts#listAgents({rootTeamRunId})` | Root-scoped agent listing | — | Existing narrow path; used by probe |
| `pages/memory.vue` `selectTeam`/`selectAgent`/`inspectAgentRun`/`inspectTeamMember` | Fetch then navigate; route watcher fetches again | Click must navigate immediately and fetch once | Route sync as the single fetch owner |
| `memoryExplorerStore.openTeamMemory` | Does not clear previous team's entries | Must not show another team's runs as this team's | Reset entries on team/agent change |

## Structural And Payload Surface Inventory

- Payload surfaces: `memory/agent_teams/<root>/team_run_execution_tree.json` (read-only here). No writes needed.
- Structural surfaces: GraphQL `listAgentTeamsWithMemory`, `listAgentTeamRunsWithMemory` (contract unchanged); frontend memory route/store.
- Potential structural impacts: API change — none. Persistence — none. Security — none. Concurrency/lifecycle — none. Migration — none.

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Requirement Implication | Evidence |
| --- | --- | --- | --- | --- |
| `curl … listAgentsWithMemory` on :29695 | Agents tab | **0.13 s** | Agents unaffected | Live backend |
| `curl … listAgentTeamsWithMemory` on :29695 | Agent Teams tab | **31.8 s** | Reproduces slow tab | Live backend |
| `curl … listAgentTeamRunsWithMemory(software-engineering-team)` | Card click (one of two calls) | **32.2 s**, total 365 runs, 15 pages | Reproduces slow open | Live backend |
| `curl … listMemoryExplorerSources` | Every route change | 0.012 s | Not a cause | Live backend |
| Node: read+parse all 526 tree files once | One full scan | 16 ms (raw), 89 ms via `listAgents()` incl. validation | One scan is cheap; N scans are not | Probe |
| Probe: current `listTeamMemberLocations` ×20 | Per-run cost | 1741 ms / 20 ≈ 87 ms each → ×534 ≈ 46 s | Confirms N² | Probe |
| Probe: root-scoped `listAgents({rootTeamRunId})` ×534 | Fixed per-run cost | 73 ms total | — | Probe |
| Probe: current `listAgentTeamRunsWithMemory` | Service level | **40.2 s** | — | Probe |
| Probe: root-scoped member lookup, same service | Service level | **0.20 s** (team runs), **0.20 s** (teams list) | ~200× faster | Probe |
| Probe: full `buildGroups()` equivalence, current vs root-scoped (root-first, full-scan fallback) | All 16 teams, all runs, all members, memory availability | **identical = true** (1.76 MB serialized), 40.2 s → 0.24 s, fallbacks = 0 | Output preserved exactly | Probe (deleted after run) |

## Stakeholder And User Evidence

| Source | Need | Strength | Implication |
| --- | --- | --- | --- |
| User | Team tab and team open should not take a very long time | Direct report + screenshots | Performance fix, no content change |

## Persisted Data And State Facts

- Read-only access to team run trees and memory files. No schema or data change. No migration.

## Product Design Request Context

- Product Design request: `Not stated`. Not needed; no UI redesign.

## Supplemental Artifact Inventory

| Artifact | Owner | Purpose | Status |
| --- | --- | --- | --- |
| Disposable probe (`autobyteus-server-ts/tests/probe-tmp/…`) | Solution Designer | Timing + equivalence | Deleted; results recorded above |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Resolution | Status |
| --- | --- | --- | --- | --- |
| RSK-001 | Risk | Even at O(N), the explorer still stats memory files for every run on every request. This is fine at 534 runs (~0.2 s); much larger stores could need caching later | Out of scope; revisit if needed | Open (non-blocking) |
| RSK-002 | Risk | While the 40 s scan runs, CPU-heavy JSON validation shares the server event loop with live agent streams | Resolved by the fix | — |
| UNK-001 | Unknown | Whether a nested (non-root) team run id is ever passed to `listTeamMemberLocations` | Only caller passes root ids; keep a full-scan fallback for non-root ids to preserve semantics | Resolved |

## Architecture Investigation Findings (SR-002, after approval)

Base refreshed: the worktree was fast-forwarded to `origin/personal` @ `40b1783f4` (a docs-only delivery-record commit on top of `1bb7bb1eb`). No memory-explorer code changed.

### Agent Org storage and code (new scope)

| Source | Observation | Design implication |
| --- | --- | --- |
| `~/.autobyteus/server-data/memory/agent_orgs` | 19 root dirs, 144 MB. Each has `agent_org_run_execution_tree.json`. Member memory is at `<orgRunId>/<agentRunId>` for root-hosted agents and `<orgRunId>/<teamRunId>/<agentRunId>` for agents inside teams | Same memory file kinds as teams; `MemoryRunSummaryBuilder` applies unchanged |
| Node scan of the org trees | Definitions: `autobyteus-org` (5 runs / 16 agents with memory), `nested-classroom-test` (9 / 13), `northstar-operating-company` (3 / 38), `software-development-department` (2 / 9). Five nested-classroom runs have task executions | AC-007 expected cards; task-instance handling matters for orgs |
| `memory/agent_org_run_history_index.json` + `run-history/store/agent-org-run-history-index-store.ts#readIndex` | Rows `{orgRunId, orgDefinitionId, orgDefinitionName, workspaceRootPath, summary, createdAt, archivedAt, terminatedAt}`; `readIndex()` is read-only and returns `[]` when missing | Org catalog source for the explorer. Avoid `AgentOrgRunHistoryCatalogService`, whose initialization owns index reconciliation |
| `agent-org-execution/services/agent-org-execution-tree-location-service.ts` | `listAgents()` has **no root filter** and `listRootIds()` is private. `findAgent({rootRunId, agentRunId})` is root-scoped. `LocatedAgentOrgAgentExecution` carries `memoryDir`, `configuredPlacement`, `memberAddress`, `tree` | Add root-scoped `listAgents({rootRunId})` and public `listRootRunIds()`, mirroring the team service |
| `agent-org-execution/services/agent-org-execution-index.ts#visitRoot` | Configured placement covers root agents and agents inside configured teams. Task agents are indexed with executionKind `task`; task-team members with `task_team_member` | The same "configured placement ≠ null" rule as teams selects members |
| `agent-org-execution/domain/agent-org-run-execution-tree.ts` | `rootOrg {orgDefinitionId, orgDefinitionName, orgRunId, members, taskExecutions}`; `createdAt` at the file level | Definition identity and name come from the tree, overridden by the catalog name |
| `agent-collaboration/execution/services/collaboration-execution-location-service.ts` | The codebase treats team and org as "two independent persistence families" under the term *collaboration* | Shared explorer core named `Collaboration…`, with family-specific sources |
| `memory-sync/shared/memory-sync-path-policy.ts` | `MEMORY_SYNC_FILE_KINDS = ["agents", "agent_teams"]` | Imported sources contain no orgs → the org tab shows its empty state; sync extension is out of scope |
| `api/graphql/types/memory-view.ts#getTeamMemberRunMemoryView` | Resolves via `AgentMemoryLocationService.resolveTeamMemberLocation`, then reads the view from `dirname(memoryDir)`; returns an empty view when not found | The org view resolver follows the same shape through the same boundary; the shared read step moves into one function |

### Defects found in the shared member structure

| Source | Observation | Classification |
| --- | --- | --- |
| `autobyteus-web/types/memory.ts#TeamMemberMemoryTargetSummary` (`memberName`) vs `memory-explorer-schema.ts:219` (`displayName`) and query `memoryExplorerQueries.ts` (requests `displayName`) | `AgentTeamMemoryDetail.vue:37` renders `member.memberName` → always undefined → blank name line. The page passes `member.memberName` to the inspector breadcrumb, which then falls back to the address | Local Implementation Defect → REQ-009 |
| `team-memory-explorer-service.ts#toMemberTargetSummary` | `agentRunId: target.member.agentRunId`, where `member` is the **configured placement**. A delegated task instance (`taskExecutions[].agentRunId`) of the configured address therefore reports the configured run's ID, while `memory` is computed from the task run's `memoryDir`. The badge and the inspector disagree, and the Vue key `${teamRunId}:${agentRunId}` duplicates | Local Implementation Defect in shared structure → REQ-010. Real data: 1 team run, 5 org runs |

### Explorer structure (current)

- `TeamMemoryExplorerService` depends on both `TeamRunExecutionTreeLocationService` (`listRootTeamRunIds`, `readTree`) **and** `AgentMemoryLocationService` (via `TeamMemoryMemberTargetBuilder`), and the latter wraps the same tree service. This is a mixed-level dependency: the explorer reads each tree once itself, and then the wrapper rescans every tree for every root.
- `AgentMemoryLocationService.listTeamMemberLocations` has exactly one caller: `TeamMemoryMemberTargetBuilder`. `resolveTeamMemberLocation` has four callers: `memory-view.ts`, `skill-improvement-target-context-resolver.ts`, `application-orchestration-host-service.ts` and `application-execution-scope.ts`. The application caller passes the bound (root) team run ID.
- `TeamRunExecutionTreeLocationService.listAgents({rootTeamRunId, configuredOnly})` exists; it reads one tree and throws on an invalid tree. Located agents carry `tree`.
- Frontend: `pages/memory.vue` handlers `selectAgent`, `selectTeam`, `inspectAgentRun` and `inspectTeamMember` all fetch and then `router.push`; the route watcher `syncRouteState` fetches again. Store `openAgentMemory`/`openTeamMemory` exist only for that pre-fetch. Existing tests: `pages/__tests__/memory.spec.ts`, `tests/stores/memoryExplorerStore.test.ts`, `components/memory/__tests__/AgentTeamMemoryDetail.spec.ts`. The web GraphQL types are generated (`generated/graphql.ts`, `pnpm codegen`).

## SR-004 Investigation: code review CRR-003 reopening (CR-002, CR-003)

Source at `bd8450984` (implementation commit). The package was reopened as a Design Impact at the user's direction ("lets refactor it now, if it makes our codebase follows better design principles").

### CR-002: the sources list is loaded on every route change

| Source | Observation | Implication |
| --- | --- | --- |
| `autobyteus-web/pages/memory.vue#syncRouteState` (lines 163–196) | `selectRouteSubject()` → `await syncRouteSource()` (`explorerStore.loadSources()`, `network-only`) → `selectRouteSubject()` again → one data fetch. The watcher is `watch(route.fullPath, …, { immediate: true })` | One extra serial round trip before every view, including detail, inspector and Back. The second selection only compensates for the await |
| `memoryExplorerStore.loadSources` / `setSelectedSourceByKey` / `resetPagesForSourceChange` | `loadSources` replaces `sources` and moves `selectedSource` to the first entry if the current one vanished; `setSelectedSourceByKey` clears selections on a change | Source-list freshness and per-route selection are mixed in one path |
| `memoryExplorerStore.resetList` + `fetchList` | `fetchList` sets `loading = true` synchronously before its first `await` | If nothing is awaited between the selection reset and the fetch, the "No runs match this filter" frame (CR-001) cannot occur |
| `components/memory/MemoryHome.vue` | The source `<select>` exists only on the Memory home view | Only the home view needs a fresh source list |
| `autobyteus-server-ts/src/memory-sync/hub/*`, `memory-sync/source/memory-sync-worker.ts` | Imported sources appear on this node when another node's sync worker pushes to the hub, independently of this UI and at any time | New imports can appear while the Memory page is open; a refresh policy is a real product decision (Requirement Gap) |

### CR-003: org history reads have side effects

| Source | Observation | Implication |
| --- | --- | --- |
| `run-history/services/agent-org-run-history-catalog-service.ts#listRows` → `ensureInitialized()` | The first call waits for package readiness, rebuilds the rows from every admitted tree and **writes** `agent_org_run_history_index.json` | A read with a repair side effect |
| `run-history/services/collaboration-root-history-service.ts#list` | The run-history sidebar (a different page) calls `orgs.listRows()` and today **relies on it** to initialize and repair the org index on first read | Making `listRows` pure requires a new explicit initialization point (startup/lifecycle) for the sidebar |
| `agent-org-execution/services/agent-org-run-service.ts:112` | Calls `history.initialize()` explicitly before creating a run | There is an existing explicit init point, but only on the create path |
| `agent-execution/runtime/general-process-run-supervisor.ts:254` | Constructs `AgentOrgRunHistoryCatalogService` | Candidate wiring point for startup initialization |
| `agent-memory/services/agent-org-root-memory-source.ts` (bd8450984) | Reads `AgentOrgRunHistoryIndexStore.readIndex()` directly (read-only), as SR-002 designed | Correct and side-effect-free today; the owner bypass exists only because the owner has no pure read |

Conclusion: CR-003's clean fix changes run-history lifecycle behavior for the org sidebar, which is outside this package's approved scope ("other pages"). It needs either a separate ticket or explicit user approval to widen scope.

### F-001 (API/E2E, pre-verdict): org task-team members listed as member targets

| Source | Observation | Implication |
| --- | --- | --- |
| API/E2E message and `api-e2e-execution-coverage-report.md`; kept test `autobyteus-server-ts/tests/e2e/memory/memory-collaboration-graphql.e2e.test.ts` ("…excludes task-team members…" fails; the other 7 pass) | 22 `task_team_member` executions are listed on a real-data copy, all in nested-classroom-test runs (`StudentStudyGroup/student_*`). Org card counts are unchanged | Breaks REQ-008 and the Out-of-Scope rule "task-team members excluded" |
| `agent-org-root-memory-source.ts:48` (`configuredPlacement !== null`); `agent-org-execution-tree-location-service.ts#toLocation` (`index.getConfiguredPlacement(agent.address)`) | Placement is looked up **by address**. Members of a task team delegated to a *configured* team address share the configured members' addresses, so they get a non-null placement | The SR-002 design mechanism does not realize the approved rule. This is the design's own escalation trigger ("the org tree shape does not support the configured-placement rule") |
| `team-root-memory-source.ts` (`listAgents({…, configuredOnly: true})`); `team-execution-index.ts` (`executionKind: "configured" \| "task" \| "task_team_member"`) | Teams use the same address-based rule. Base `40b1783f4` behaves identically. Real team data has 0 task teams (SR-001 scan), so there is no visible impact today | The SR-002 claim "the Agent Teams rule excludes task-team members" was true only for task teams at unconfigured addresses. One kind-based rule for both families realizes the approved statement |
| `agent-org-execution-index.ts` / `team-execution-index.ts` | Both indexes record `executionKind` per agent execution, but neither `LocatedTeamAgentExecution` nor `LocatedAgentOrgAgentExecution` exposes it | Expose `executionKind` on the located shapes; the sources select `configured` + `task` |
| API/E2E fixture note | `agent-org-memory-explorer-service.test.ts` puts the task team at an unconfigured address (`/review_squad`), which the readiness validator would never admit | The unit fixture must use an admitted shape (task team delegated to a configured team) |

### O-001 (API/E2E open item, not a design question)

The built dev server on a data copy admitted 385 of 535 team roots, listing 302 SE runs. 142 rejections read "communication messages has unsupported or missing field(s)". In-process base and new code both list 367, and the live app showed about 365. The readiness rules are unchanged by this package. Owner: API/E2E next round (old vs new server on the same copy). Not yet classified as a regression.

### API/E2E evidence carried forward (bd8450984)

REQ-004 equivalence on a frozen copy: the team list, SE runs (367) and 6 searches are identical to base. Time: base 48.9 s / 48.0 s / 320 s vs new 1.3 s / 0.18 s / 1.1 s. Live built backend: teams 0.14–0.18 s, SE runs 0.12–0.15 s, orgs 0.02 s (QR-001 met).

### CR-004: integrating origin/personal (code review CRR-004)

`git fetch origin personal` on 2026-09-25 → `origin/personal` @ `589005470`, 16 commits ahead of base `40b1783f4`. Commits that overlap this package:

| Commit | Change | Implication for this package |
| --- | --- | --- |
| `b68847a8c` (merged in `ecfc8cc0f`) | New `run-history/services/collaboration-run-history-catalog-core.ts`. `TeamRunHistoryCatalogService.listCatalogRows()` and `AgentOrgRunHistoryCatalogService.listCatalogRows()` are pure: they await package readiness, read the index once per memory dir and family, filter by admission, and never write. Repair moves to `collaboration-run-history-index-repair.ts`. The manager hook is renamed `withUnmanagedHistoryDeletion` → `withInactiveHistoryMutation`. `team-run-history-index-service.ts` was removed | **CR-003 is resolved upstream.** `AgentOrgRootMemorySource` can depend on the org history owner (symmetric with teams, admission-filtered). Both sources' stored-only managers must implement `withInactiveHistoryMutation` |
| `49ce0d173` | The upstream team explorer (old structure) gained one tree read per root through `AgentMemoryLocationService.listTeamMemberLocationsFromTree` + `TeamRunExecutionTreeLocationService.listAgentsInTree` + `TeamMemoryMemberTargetBuilder.buildFromTree`; a root/tree-ID mismatch is skipped. Tests: "one read per admitted root … leaves all files unchanged" (explorer), "projects … from the already-read tree" (location service) | Same goal as SR-002 in the structure this branch replaces. The new APIs would have **no production caller** after the merge |
| `40f769e0d` and others | External messaging removed; release bumps | No memory-feature file overlap (checked with `git diff --stat 40b1783f4 origin/personal` over the memory paths). The web GraphQL codegen must be rerun on the merged schema |

Facts checked on the merged-to-be code:
- `team-run-execution-tree-schema.ts:94` and `agent-org-run-execution-tree-schema.ts:103` both throw when the tree root ID differs from the expected ID. Our sources read via `listAgents({rootTeamRunId})` / `listAgents({rootRunId})` → `store.read(dir, requestedId)` → validate(expected = requestedId). So upstream's root-mismatch invariant **already holds** in this branch's structure; a mismatch throws and the catalog's skip rule applies.
- `configuredOnly` on `TeamRunExecutionTreeLocationService.listAgents` has one caller: `team-root-memory-source.ts`.

### SR-004 user decision on task executions (2026-09-25) and supporting evidence

- User: the Memory explorer must show all memory, "including task agent and task agent teams … following the same structure as it is shown". F-001's exclusion direction is reversed; this becomes REQ-012.
- Structure source: `run-history/domain/run-execution-tree-shared-records.ts`. `ConfiguredTeamExecutionNode{members, taskExecutions}`, `TaskAgentExecution{address, agentRunId, startedAt, settledAt}`, `TaskTeamExecution{address, teamRunId, members, taskExecutions, startedAt, settledAt}`, and `TaskTeamNestedTeamExecution` allow nesting at any depth.
- Existing presentation of the same structure: `autobyteus-web/stores/runHistoryTeamExecutionRows.ts` (stable member rows + `task_agent` / `task_team` / `task_team_child` transient rows with depth); `utils/agentOrgHistoryRows.ts` (org rows `agent`, `team`, `task_agent`, `task_team`); `components/workspace/history/WorkspaceTransientExecutionRow.vue` (dashed indigo task rows, tree branches).
- Orphan scan (command in session, 2026-09-25): team memory dirs 2158, 0 not in their tree; org memory dirs 102, **4 not referenced by their tree**, all under `nested_classroom_test_team_*` runs in `studentstudygroup_*` subfolders (probably task teams whose structure entry was never committed). → DEC-004.

### DEC-004 root cause: unlisted memory folders (2026-09-25)

- Example run `agent_orgs/nested_classroom_test_team_7b697dd9…`: created 2026-06-30 as a **team** run (the folder name still says `_team_`) and converted to an org run by the Sep 15 flat-team-families migration (tree and records dated Sep 15; `fs.rename` of the whole folder in `agent-org-flat-team-families-v1-app-data-migration.ts:173`, so contents stayed physically inside the run).
- The unlisted folder `studentstudygroup_5f3c…/student_one_c08d…` holds `raw_traces_active.jsonl` and `working_context_snapshot.json` dated **2026-06-30**. The first trace says: "Your team is accountable for the delegated task below. This task-scoped team run exits after acceptance and safe settlement." So it is a **delegated task team** run.
- The current record has **no** task executions (`rootOrg.taskExecutions` = [], team `taskExecutions` = []), and `agent_org_task_delegation_records.json` has `records: []`. The only remaining reference to `studentstudygroup_5f3c…` is inside the Teacher's own raw traces (the delegate result).
- The configured StudentStudyGroup members in the record (`student_one_37f5…`, `student_two_25c3…`) have **no** memory folders anywhere. They never ran.
- The Sep migration carries `taskExecutions` over unchanged (`agent-org-runtime-tree-target.ts:11`), so the task entry was already missing before September. The student folders' mtime is 2026-07-07. A July team-history migration or recovery (there is a worktree `agent-team-released-history-migration-recovery`) most likely rebuilt the record without the June task entry. **Inference, not proven.**
- Conclusion: the memory content is real (a delegated task from June). It is physically inside its run folder but **disconnected from the run's record** because of an old data transition. Scope: 4 folders, only in `nested-classroom-test` test runs. It is not a supported product path today.

## Requirement Implications

The cause is backend algorithmic cost (N² tree reads), made about twice as bad by the frontend fetching before navigating and again after. It is not a memory leak. Content is correct, and the fix must keep it identical.

## Notes For Architecture Design

- Scenarios to realize: SCN-001, SCN-002, SCN-003.
- Verified candidate: root-scoped member lookup, root first with the existing full-scan semantics as fallback. Its equivalence is proven on real data.
- Frontend: make route sync the single fetch owner; navigate immediately on click; reset the detail list on selection change.
