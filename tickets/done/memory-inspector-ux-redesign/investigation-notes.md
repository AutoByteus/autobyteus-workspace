# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Complete for design package
- Investigation Goal: Understand the current Memory UI, backend memory APIs/storage, identity model, and constraints needed to redesign memory navigation around agents and teams before runs.
- Scope Classification (`Small`/`Medium`/`Large`): Large
- Scope Classification Rationale: The request touches product UX, frontend state/navigation, backend GraphQL query shape, backend service/read-model ownership, tests, generated frontend schema/types, and legacy memory visibility.
- Scope Summary: Redesign the Memory page so users browse independent agents and agent teams that have stored memory first, then runs/member targets, then inspect memory content; backend-for-frontend support is an explicit part of the scope.
- Primary Questions To Resolve:
  - Where is the current Memory page implemented? Resolved.
  - What backend API exposes memory lists and memory content? Resolved.
  - Does backend storage/indexing support listing distinct agents/teams and filtering runs by selected agent/team? Partially; metadata exists, but current memory index APIs do not expose this shape.
  - Which identity shapes distinguish agent definition, agent run, team definition, team run, team member/agent, and memory path? Resolved for design.
  - What UI states and navigation model should replace the flat Agent Runs / Team Runs toggle? Resolved in `experience-story.md` and `design-spec.md`.

## Request Context

The user reports the current Memory area is very fundamental/basic. The screenshot shows a Memory page with an `Agent Runs` / `Team Runs` scope toggle, run-id search/manual load, a flat run list, and a right-side Memory Inspector. The user wants to improve visibility and UX by first showing a list of agents, allowing the user to click an agent, then showing that agent's runs and memory for a selected run. The same principle should apply to team runs. The user requested backend analysis plus a text-form UI prototype/design.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-inspector-ux-redesign`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-inspector-ux-redesign/tickets/memory-inspector-ux-redesign`
- Current Branch: `codex/memory-inspector-ux-redesign`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-inspector-ux-redesign`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` completed successfully on 2026-05-31.
- Task Branch: `codex/memory-inspector-ux-redesign`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None.
- Notes For Downstream Agents: The original shared checkout `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` was on `personal` behind `origin/personal` with untracked `blingda.txt`; this task uses a dedicated clean worktree.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-05-31 | Setup | `pwd && git rev-parse --show-toplevel && git status --short --branch && git remote -v && git branch --show-current && git symbolic-ref refs/remotes/origin/HEAD` in `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` | Bootstrap environment | Shared checkout is Git repo on `personal`, tracking `origin/personal`, behind 4, with untracked `blingda.txt`. | No |
| 2026-05-31 | Setup | `git fetch origin --prune` | Refresh base refs before creating task worktree | Fetch completed successfully. | No |
| 2026-05-31 | Setup | `git worktree add -b codex/memory-inspector-ux-redesign /Users/normy/autobyteus_org/autobyteus-worktrees/memory-inspector-ux-redesign origin/personal` | Create dedicated task worktree/branch | Worktree created at HEAD/base `209e8915f6d9180731d0ace2d8d001c0a8d889cd`. | No |
| 2026-05-31 | Doc | `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/design-principles.md` | Required shared design reference | Design must be spine-first, ownership-explicit, with explicit interface boundaries and no compatibility-only dual paths. | No |
| 2026-05-31 | Doc | `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/references/design-examples.md` | Concrete shape guidance for spine/interface mapping | Examples reinforce explicit subject-owned interfaces and avoiding generic resume/view selectors when identity differs. | No |
| 2026-05-31 | Data | `/Users/normy/.autobyteus/server-data/memory/agent_teams/team_software-engineering-team_fe9a327c/solution_designer_fa306f0593917cd6/context_files/ctx_2f3191a58dd0__image.png` | User-provided screenshot reference | Shows current Memory UI: side nav, Memory page with `Agent Runs` / `Team Runs` toggle, search/manual run ID controls, flat run list, Memory Inspector tabs. | No |
| 2026-05-31 | Command | `rg -n "Memory Inspector|Stored run memories|Agent Runs|Team Runs|Raw Trace|Raw Traces|Working Context|Episodic|Semantic|Manual Run Id|run memories" autobyteus-web autobyteus-server-ts autobyteus-ts autobyteus-application-* applications -S` | Locate current memory UI/API code | Found `autobyteus-web/components/memory/*`, Pinia stores, GraphQL queries, backend memory services/resolvers, and previous memory view tickets. | No |
| 2026-05-31 | Code | `autobyteus-web/pages/memory.vue` | Current page entrypoint | Renders fixed two-pane layout: `MemoryIndexPanel` aside and `MemoryInspector` main; on mount resets scope to agent and fetches flat agent index. | No |
| 2026-05-31 | Code | `autobyteus-web/components/memory/MemoryIndexPanel.vue` | Current navigation implementation | One component owns scope toggle, search, manual run ID, list rendering for agents and teams, team expansion, member selection, and pagination. | No |
| 2026-05-31 | Code | `autobyteus-web/components/memory/MemoryInspector.vue` | Current inspector behavior | Inspector switches between agent/team view stores based on scope and shows tabs; header subtitle is run-first (`Agent Run: <id>` / team/member/run). | No |
| 2026-05-31 | Code | `autobyteus-web/stores/agentMemoryIndexStore.ts`, `teamMemoryIndexStore.ts`, `agentMemoryViewStore.ts`, `teamMemoryViewStore.ts`, `memoryScopeStore.ts` | Current frontend state ownership | Separate agent/team index and view stores duplicate selection/raw-trace behavior; scope store only tracks `'agent' | 'team'`. | No |
| 2026-05-31 | Code | `autobyteus-web/graphql/queries/agentMemoryIndexQueries.ts`, `agentMemoryViewQueries.ts`, `teamMemoryQueries.ts`, `types/memory.ts` | Current frontend API contracts | Index queries are run-first. View query shapes can be reused conceptually but standalone query name is generic `getRunMemoryView`. | No |
| 2026-05-31 | Code | `autobyteus-server-ts/src/api/graphql/types/memory-index.ts`, `memory-view.ts` | Backend GraphQL surface | `listRunMemorySnapshots` returns only run snapshots; `listTeamRunMemorySnapshots` returns team-run snapshots; memory view reads by run ID or by `teamRunId + memberRunId`. | No |
| 2026-05-31 | Code | `autobyteus-server-ts/src/agent-memory/services/agent-memory-index-service.ts` | Agent memory index owner | Scans `memory/agents` run dirs, filters by run ID substring, sorts by memory file mtime; no metadata/agent grouping. | No |
| 2026-05-31 | Code | `autobyteus-server-ts/src/agent-memory/services/team-memory-index-service.ts` | Team memory index owner | Reads team metadata and member memory flags but groups/paginates by team run, not team definition. | No |
| 2026-05-31 | Code | `autobyteus-server-ts/src/agent-memory/services/agent-memory-service.ts`, `store/memory-file-store.ts`, `store/agent-run-memory-layout.ts`, `store/team-member-memory-layout.ts` | Memory content read path and storage layout | Existing content read path can remain; layout is `agents/<runId>` and `agent_teams/<teamRunId>/<memberRunId>`. | No |
| 2026-05-31 | Code | `autobyteus-server-ts/src/run-history/store/agent-run-metadata-types.ts`, `agent-run-metadata-store.ts`, `agent-run-history-index-record-types.ts` | Agent metadata source | Run metadata has `agentDefinitionId`, workspace/model/runtime; run history index has `agentName`, `summary`, `createdAt`, archived/terminated status. | No |
| 2026-05-31 | Code | `autobyteus-server-ts/src/run-history/services/agent-run-history-service.ts`, `workspace-run-history-service.ts` | Existing grouping logic | Existing run history already groups by workspace and agent definition, but limits per agent and is not memory availability aware. | No |
| 2026-05-31 | Code | `autobyteus-server-ts/src/run-history/store/team-run-metadata-store.ts`, `team-run-metadata-types.ts`, `services/team-run-history-service.ts`, `services/team-run-metadata-flattener.ts` | Team metadata source | Team metadata contains team definition and leaf agent member identities; history service supplies summaries/status/workspace. | No |
| 2026-05-31 | Command/Data | Python probe against `/Users/normy/.autobyteus/server-data/memory` counting run dirs, history rows, metadata, and team groups | Validate real local data shape and scale | Found 236 standalone agent run dirs, 38 run history rows, 151 standalone dirs with no history/metadata, 10 team groups, 127 software-engineering team runs. | No |
| 2026-05-31 | Code/Test | `autobyteus-server-ts/tests/unit/agent-memory/agent-memory-index-service.test.ts`, `team-memory-index-service.test.ts`, `tests/e2e/memory/memory-index-graphql.e2e.test.ts`, `autobyteus-web/tests/stores/*Memory*`, component tests | Understand existing validation coverage | Tests assert flat run-first API/UI behavior and will need replacement for agent/team-first behavior. | No |
| 2026-05-31 | Doc | `autobyteus-web/tickets/memory_view_ui_ticket/MEMORY_VIEW_UI_DESIGN.md`, `autobyteus-server-ts/tickets/memory_view_api_ticket/MEMORY_VIEW_API_DESIGN.md` | Historical design context | Original design intentionally shipped a basic memory inspector with run snapshot list and noted optional labels; this ticket is a product/UX evolution beyond that scope. | No |
| 2026-05-31 | Other | User clarification after initial artifact delivery | Clarify product/back-end intent | User emphasized this is a backend-for-frontend problem: backend should be refactored to support a better Memory UX similar to the Agents page interaction, where users first see/select an agent or agent team with memory and then enter that agent/team's memory runs. | No |
| 2026-05-31 | Other | User clarification after BFF catalog wording | Correct memory-derived inclusion rule | User clarified Memory must show only independent agents or agent teams that have memory; configured agents/teams that were never run and have no memory should not appear. | No |
| 2026-05-31 | Other | User clarification with 100 agents/5 used example | Confirm memory-derived source of truth | User clarified that if 100 independent agents/teams exist but only 5 have memory, Memory must show only those 5; the first list source is stored memory / memory-bearing run history, with metadata only enhancing display. | No |
| 2026-05-31 | Other | User approval of page-based direct-label design | Lock requirements/design basis | User approved the design and asked to update requirements/design accordingly; approved flow is Memory Home -> Agent Memory Detail -> Agent Run Memory Inspector and Memory Home -> Agent Team Memory Detail -> Team Member Memory Inspector, using direct labels and memory-derived lists only. | No |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: `autobyteus-web/pages/memory.vue`.
- Current execution flow:
  - Page mounts → `memoryScopeStore.resetToDefault()` → flat agent index fetch.
  - `MemoryIndexPanel` toggles `agent`/`team` scope.
  - Agent scope calls `listRunMemorySnapshots(search,page,pageSize)` and renders flat run IDs.
  - Agent run selection calls `agentMemoryViewStore.setSelectedRunId(runId)` → `getRunMemoryView(runId, include...)`.
  - Team scope calls `listTeamRunMemorySnapshots(search,page,pageSize)` and renders flat team runs with expandable member rows.
  - Team member selection calls `teamMemoryViewStore.setSelectedMember(...)` → `getTeamMemberRunMemoryView(teamRunId, memberRunId, include...)`.
  - `MemoryInspector` reads whichever view store matches the global scope and renders tabs.
- Ownership or boundary observations:
  - Backend memory index boundary exposes storage/run snapshots, not user-facing agents or agent teams with memory.
  - Frontend navigation mirrors this run-first backend shape.
  - `MemoryIndexPanel` is a responsibility blob; it owns multiple navigation levels and two distinct identity models.
  - View stores duplicate raw trace limit/include behavior for standalone and team-member targets.
- Current behavior summary: The current UI answers “which run ID should I inspect?” It does not answer “which agent/team do I want to inspect first?”

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Larger Requirement / Behavior Change
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue plus File Placement Or Responsibility Drift
- Refactor posture evidence summary: Refactor needed now because agent/team-first navigation requires backend agent/team and run read models and frontend split responsibilities; restyling the current monolithic panel would preserve the wrong governing concept.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| User screenshot/request | User cannot select a specific agent/team before searching runs. | Current UX exposes run storage as the primary navigation unit instead of agent/team memory ownership. | Address in design. |
| `AgentMemoryIndexService` | `listSnapshots` returns only `runId` and memory flags. | Backend lacks a agent/team-first read model; frontend cannot reliably group without duplicating metadata logic. | Add agent/team-first services. |
| `TeamMemoryIndexService` | Has team metadata but still paginates by team run. | Team memory has enough metadata for team grouping but the current API boundary is run-first. | Add team memory explorer boundaries. |
| `MemoryIndexPanel.vue` | Mixes scope, search, manual load, two list models, selection, expansion, and pagination. | File responsibility drift; adding agent/team-first UX here would deepen the blob. | Split components/stores. |
| Local memory probe | 151 standalone dirs have no history/metadata. | Pure history-based grouping would hide legacy memory; design needs explicit `Unattributed runs` fallback. | Add fallback grouping. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/pages/memory.vue` | Memory page shell | Two-pane `MemoryIndexPanel` + `MemoryInspector`; default fetch is agent flat index. | Replace page shell with agent/team detail and inspector explorer layout. |
| `autobyteus-web/components/memory/MemoryIndexPanel.vue` | Current memory index UI | Monolithic run-first panel. | Remove/replace with agent/team list + run list + team member target components. |
| `autobyteus-web/components/memory/MemoryInspector.vue` | Memory content tabs | Usable tab concept, but header is run-first and relies on scope-specific stores. | Keep tab content pattern; make inspector target/breadcrumb explicit. |
| `autobyteus-web/stores/agentMemoryIndexStore.ts` | Flat standalone run index state | Fetches `listRunMemorySnapshots`. | Replace with agent detail/run explorer store. |
| `autobyteus-web/stores/teamMemoryIndexStore.ts` | Flat team run index + expansion state | Fetches `listTeamRunMemorySnapshots`. | Replace with team detail/run/member explorer store. |
| `autobyteus-web/stores/agentMemoryViewStore.ts` / `teamMemoryViewStore.ts` | Scope-specific content view state | Duplicate raw trace and selected-memory behavior. | Consolidate around explicit `MemoryInspectTarget`. |
| `autobyteus-server-ts/src/api/graphql/types/memory-index.ts` | Current memory index GraphQL resolver/types | Run-first GraphQL surface. | Replace/add agent/team-first GraphQL types/resolvers. |
| `autobyteus-server-ts/src/agent-memory/services/agent-memory-index-service.ts` | Standalone memory run summary | Useful memory-file flag builder but no metadata grouping. | Refactor into reusable run summary/enrichment service under explorer owner. |
| `autobyteus-server-ts/src/agent-memory/services/team-memory-index-service.ts` | Team run memory summaries | Has member memory flags; lacks team-definition grouping. | Extend/refactor into team memory explorer service. |
| `autobyteus-server-ts/src/run-history/services/*history*` | Run/team historical metadata and grouping | Provides names, summaries, workspace, status. | Reuse as enrichment, not as memory authority. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-05-31 | Probe | Python script scanning `/Users/normy/.autobyteus/server-data/memory` for agent dirs, run history rows, run metadata, team metadata | 236 standalone dirs; 38 run-history rows; 151 standalone dirs lack history/metadata; 10 team groups; 127 software-engineering-team runs. | Agent/team-first UI is justified; backend must include unattributed legacy grouping. |
| 2026-05-31 | Visual inspection | `view_image` on user screenshot | Current UI is flat run list with manual ID and right inspector. | Text prototype should change information architecture, not only labels. |

## External / Public Source Findings

- Public API / spec / issue / upstream source: None used.
- Version / tag / commit / freshness: N/A.
- Relevant contract, behavior, or constraint learned: N/A.
- Why it matters: N/A.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: Not required for design investigation; code and local data inspection were sufficient.
- Required config, feature flags, env vars, or accounts: None.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated worktree creation as recorded above.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

1. Current frontend and backend were intentionally built around “stored run memories,” matching historical ticket language. The clarified target is backend-for-frontend support for agent/team agent/team-first navigation similar to the Agents/Agent Teams pages.
2. Backend content reading is separable from navigation/indexing and should be reused.
3. Backend has richer identity metadata in run history and team metadata, but current memory GraphQL does not expose it to the Memory page.
4. Real local data contains enough repeated team/agent history that agent/team grouping is materially better than a flat list.
5. Legacy/unattributed standalone run dirs are common and need a visible fallback group.

## Constraints / Dependencies / Compatibility Facts

- Existing memory payload file names are imported from `autobyteus-ts/memory/store/memory-file-names.js` and should remain unchanged.
- Existing `MemoryFileStore` supports standalone and team member layouts via `runRootSubdir` and should remain the persistence boundary.
- Existing GraphQL-generated frontend file `autobyteus-web/generated/graphql.ts` includes flat memory operations; implementation must regenerate or update types after schema/query changes.
- Existing tests assert flat behavior and must be updated rather than left as compatibility coverage for old primary UX.
- The design should not depend on backward-compatible flat UI paths.

## Open Unknowns / Risks

- Whether old flat GraphQL memory index queries have external consumers outside the checked repo. Code search found no repo consumers beyond current Memory UI/tests.
- Whether performance remains acceptable on very large memory directories. Current local scale is hundreds of run dirs; design uses paginated results and can defer persistent indexing.
- Some old run metadata may have extra historical fields. New metadata enrichment should ignore unknown fields and tolerate missing metadata.

## Notes For Architect Reviewer

- The key architecture decision is to make `Memory Explorer` agent/team-first and identity-explicit, not run-list-first.
- The memory payload read path should not be rewritten; the refactor is mostly around index/read-model ownership, GraphQL surface, and frontend state/component boundaries.
- The old flat index UI and GraphQL index shape are the legacy pieces to remove or replace, not wrap.
