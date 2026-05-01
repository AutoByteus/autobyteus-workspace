# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete; dedicated task worktree created.
- Current Status: Code investigation complete for solution design.
- Investigation Goal: Determine the current frontend/backend run-history list and remove/delete flows, then design a non-destructive archive capability that hides archived agent and agent-team runs from the default UI.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: Touches frontend history UI/state, GraphQL mutation contracts, backend history services, metadata persistence, and tests for both agent and team run history.
- Scope Summary: Add archive semantics distinct from hard delete/remove for historical runs shown in the history/sidebar. Archived inactive runs should be hidden from default list while stored memory remains intact.
- Primary Questions To Resolve:
  - Which frontend components render the screenshot list and expose stop/remove actions? Resolved.
  - Which backend APIs persist and list agent run and agent-team run history? Resolved.
  - Does persistence already support a hidden/archived state? Resolved: no existing archive state found.
  - Should archive be a single shared abstraction or separate explicit agent/team run commands? Resolved: explicit agent/team commands, sharing patterns but not ambiguous IDs.
  - Where should invalid/path-unsafe archive ID rejection live? Resolved after architecture review: in `AgentRunHistoryService` and `TeamRunHistoryService`, before metadata read/write.

## Request Context

User asks whether an archiving feature can be provided because the frontend currently shows many historical agent and agent-team runs. Existing remove action is described by the user as destructive: it removes the whole memory/agent run. Desired archive action should not remove data but should stop showing archived runs in the default list.

Screenshots show Teams sidebar/history rows under "Software Engineering Team (36)", with row titles, status dots, timestamps, and trash/remove icons on selected/hovered rows.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/archive-run-history`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/archive-run-history/autobyteus-web/tickets/history-run-archive`
- Current Branch: `codex/archive-run-history`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/archive-run-history`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` completed successfully on 2026-05-01 before worktree creation.
- Task Branch: `codex/archive-run-history` tracking `origin/personal`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None.
- Notes For Downstream Agents: Original shared worktree `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` had untracked `docs/future-features/`; it was not used for task artifacts or edits.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-05-01 | Command | `pwd && git rev-parse --show-toplevel && git status --short --branch && git remote -v && git branch --show-current && git symbolic-ref refs/remotes/origin/HEAD` | Bootstrap environment discovery | Repo root `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`; branch `personal` tracks `origin/personal`; untracked `docs/future-features/`; remote `origin`; default remote HEAD `origin/personal`. | No |
| 2026-05-01 | Command | `git fetch origin --prune && git worktree list --porcelain` | Refresh remotes and determine reusable task worktrees | Remote refresh succeeded; no existing `codex/archive-run-history` worktree. | No |
| 2026-05-01 | Command | `git worktree add -b codex/archive-run-history /Users/normy/autobyteus_org/autobyteus-worktrees/archive-run-history origin/personal` | Create mandatory dedicated task worktree/branch | Worktree created at `/Users/normy/autobyteus_org/autobyteus-worktrees/archive-run-history`, branch `codex/archive-run-history`, HEAD `5995fd8f`. | No |
| 2026-05-01 | Doc | `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/design-principles.md` | Required shared design reference | Use spine/ownership model, explicit interface boundaries, no compatibility wrappers, task design health assessment. | No |
| 2026-05-01 | Code | `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue` | Identify frontend history list owner and row action composition | Panel fetches history on mount and refresh interval, wires `useWorkspaceHistoryMutations`, passes actions/state to workspace section, and owns delete confirmation modal. | Add archive wiring and state/action contract. |
| 2026-05-01 | Code | `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue` | Inspect row rendering/action visibility | Active agent rows show stop; draft rows show remove; inactive history agent rows show permanent-delete trash. Team rows show draft remove, terminate, or permanent delete depending status/deleteLifecycle. Counts come from visible row arrays. | Add separate archive affordance for inactive persisted agent/team rows. |
| 2026-05-01 | Code | `autobyteus-web/composables/useWorkspaceHistoryMutations.ts` | Locate frontend mutation intent owner | Composable separates terminate, draft remove, permanent delete, confirmation, in-flight maps, and toasts. | Extend with archive actions/in-flight guards; keep delete confirmation separate. |
| 2026-05-01 | Code | `autobyteus-web/stores/runHistoryStore.ts` | Locate frontend history state owner and delete cleanup | Store fetches/open history; `deleteRun` and `deleteTeamRun` call GraphQL, remove rows from `workspaceGroups`, clear resume configs, remove local contexts, clear selection, and refresh quietly. | Add archive actions that reuse local hide/cleanup semantics without deleting memory. |
| 2026-05-01 | Code | `autobyteus-web/graphql/queries/runHistoryQueries.ts` and `autobyteus-web/graphql/mutations/runHistoryMutations.ts` | Inspect existing GraphQL operation documents | `ListWorkspaceRunHistory` is the default listing. Mutations include `DeleteStoredRun` and `DeleteStoredTeamRun` only. | Add archive mutations. |
| 2026-05-01 | Code | `autobyteus-web/stores/runHistoryReadModel.ts`, `autobyteus-web/stores/runHistoryStoreSupport.ts`, `autobyteus-web/utils/runTreeProjection.ts` | Understand default list projection and local row removal helpers | Projection builds visible tree from `workspaceGroups`; support file already has `removeRunFromWorkspaceGroups` and `removeTeamRunFromWorkspaceGroups`. | Archive can reuse row-removal helpers locally. Backend should be authoritative filter. |
| 2026-05-01 | Code | `autobyteus-server-ts/src/api/graphql/types/run-history.ts`, `autobyteus-server-ts/src/api/graphql/types/team-run-history.ts` | Locate GraphQL API boundary | `listWorkspaceRunHistory`, `deleteStoredRun`, and `deleteStoredTeamRun` exist. Resolvers are thin and delegate to history services. | Add thin archive mutations. |
| 2026-05-01 | Code | `autobyteus-server-ts/src/run-history/services/workspace-run-history-service.ts` | Inspect default workspace grouping boundary | Service merges agent history groups and team history rows; grouping occurs after agent/team services produce their lists. | Archive filtering belongs below this service in agent/team history services. |
| 2026-05-01 | Code | `autobyteus-server-ts/src/run-history/services/agent-run-history-service.ts` | Inspect agent list/delete behavior | `listRunHistory` reads index rows, reads metadata to remove stale rows, overlays active state, groups by workspace/agent and applies limit. `deleteStoredRun` rejects active, deletes `memory/agents/<runId>`, and removes index row. | Add `archiveStoredRun`; filter archived inactive rows during list without deleting directory/index row. |
| 2026-05-01 | Code | `autobyteus-server-ts/src/run-history/services/team-run-history-service.ts` | Inspect team list/delete behavior | `listTeamRunHistory` reads index rows, reads team metadata, builds member items, overlays active state, sorts. `deleteStoredTeamRun` rejects active, deletes `agent_teams/<teamRunId>`, removes index row. | Add `archiveStoredTeamRun`; filter archived inactive rows during list without deleting directory/index row. |
| 2026-05-01 | Code | `autobyteus-server-ts/src/run-history/store/agent-run-metadata-types.ts`, `agent-run-metadata-store.ts`, `team-run-metadata-types.ts`, `team-run-metadata-store.ts` | Determine durable place for archive state | Agent metadata lacks archive state and currently normalizes a fixed subset. Team metadata validation is strict and lacks archive state. Optional application execution context appears in types but is not preserved by current normalizers. | Add optional `archivedAt`; preserve unrelated optional metadata fields during normalization/write. |
| 2026-05-01 | Code | `autobyteus-server-ts/src/run-history/services/agent-run-history-index-service.ts`, `team-run-history-index-service.ts`, index store files | Determine whether archive belongs in index | Index rows are read models for listing; rebuild derives rows from metadata/memory. List services already read metadata for each row. | Do not remove index row on archive; use metadata as canonical archive state so rebuilds preserve archived status. |
| 2026-05-01 | Code | `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts`, regressions spec, `autobyteus-web/stores/__tests__/runHistoryStore.spec.ts` | Identify frontend test coverage and expected additions | Tests cover delete visibility, delete confirmation, draft removal, terminate behavior, and run store delete cleanup. | Add archive visibility/action/store cleanup/failure tests. |
| 2026-05-01 | Code | `autobyteus-server-ts/tests/unit/run-history/services/*`, `store/*` | Identify backend test coverage and expected additions | Existing tests cover list grouping, delete behavior, metadata store roundtrip/defaults, team summary backfill. | Add metadata archive/default tests and service archive/filter tests. |
| 2026-05-01 | Command | `cat autobyteus-web/package.json | jq '.scripts'` and `cat autobyteus-server-ts/package.json | jq '.scripts'` | Find likely verification commands | Web: `pnpm test:nuxt`, `pnpm codegen`; Server: `pnpm typecheck`, `pnpm test`. | Implementation should run targeted vitest first, broader checks as time allows. |
| 2026-05-01 | Doc | `autobyteus-web/tickets/history-run-archive/design-review-report.md` | Architecture review feedback | Review failed with `AR-ARCH-001`: archive commands must reject invalid/path-unsafe IDs before metadata read/write; policy belongs in history services and tests must prove no out-of-root metadata write. | Apply design rework. |
| 2026-05-01 | Code | `autobyteus-server-ts/src/run-history/services/agent-run-history-service.ts`, `team-run-history-service.ts` | Recheck existing delete safety pattern for archive adaptation | Existing destructive delete paths use private safe-directory resolution before recursive remove. Archive should adapt this service-level containment/base-name validation before calling metadata stores. | Add to design spec and tests. |
| 2026-05-01 | Code | `autobyteus-server-ts/src/run-history/store/agent-run-metadata-store.ts`, `team-run-metadata-store.ts` | Recheck metadata path derivation risk | Metadata paths are derived from supplied run/team IDs, so unsafe direct archive IDs could otherwise influence filesystem paths. | Enforce safety in history services before metadata access. |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: `WorkspaceAgentRunsTreePanel.vue` renders the default run history/sidebar and fetches `runHistoryStore.fetchTree()` on mount plus periodic quiet refresh.
- Current execution flow:
  - Default list: `WorkspaceAgentRunsTreePanel` -> `runHistoryStore.fetchTree` -> Apollo `ListWorkspaceRunHistory` -> `RunHistoryResolver.listWorkspaceRunHistory` -> `WorkspaceRunHistoryService.listWorkspaceRunHistory` -> `AgentRunHistoryService.listRunHistory` + `TeamRunHistoryService.listTeamRunHistory` -> frontend `workspaceGroups` -> tree/team projections -> `WorkspaceHistoryWorkspaceSection` rows.
  - Permanent delete: row trash -> `useWorkspaceHistoryMutations.onDeleteRun/onDeleteTeam` -> confirmation -> `runHistoryStore.deleteRun/deleteTeamRun` -> GraphQL `deleteStoredRun/deleteStoredTeamRun` -> history service deletes disk directory and index row -> frontend removes row/context/selection and refreshes.
  - Terminate: active row stop -> runtime store termination -> backend runtime termination -> history refresh marks inactive.
- Ownership or boundary observations:
  - UI section is presentation/dispatch only.
  - Mutation composable owns per-row UI intent, pending states, confirmation, and toasts.
  - `runHistoryStore` owns frontend history state cleanup.
  - Backend history services own destructive delete rules and should also own archive rules.
  - Metadata stores own durable per-run metadata normalization/persistence.
- Current behavior summary: Inactive persisted rows can be permanently deleted, but there is no non-destructive hidden/archive state. Default list returns all non-stale indexed runs/teams.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature / behavior change.
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing invariant plus shared structure looseness.
- Refactor posture evidence summary: Bounded refactor needed in metadata normalization and local frontend cleanup reuse. No broad subsystem rewrite needed.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| User screenshot/request | Run list grows noisy; remove is too destructive for decluttering. | Need non-destructive lifecycle/visibility state separate from delete/remove. | Implement archive state. |
| `agent-run-history-service.ts` / `team-run-history-service.ts` | List services already read metadata for each index row. | Metadata can govern archive filtering without new storage subsystem. | Add `archivedAt` and filter inactive archived rows. |
| Metadata store normalizers | Current normalizers write fixed metadata subsets and omit optional application execution context fields from types. | New archive writes must not silently drop unrelated optional metadata. | Tighten normalizers to preserve optional fields while adding `archivedAt`. |
| `runHistoryStore.ts` | Delete cleanup removes visible rows, resume config, local context, and selection. | Archive success needs same visible-state cleanup, without memory deletion. | Reuse/extract local cleanup logic; do not duplicate policy in components. |
| `deleteStoredRun` / `deleteStoredTeamRun` | Existing delete removes directories and index rows. | Archive must be a separate API; do not overload delete or use index removal as soft delete. | Add explicit archive mutations. |
| Architecture review `AR-ARCH-001` | Direct archive mutations would read/write metadata paths from supplied IDs unless services validate first. | Archive command boundary must own path-safe ID rejection before metadata access. | Add service-level safety contract and invalid-ID tests. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue` | Container for history panel, fetch lifecycle, mutation composable wiring, confirmation modal. | Already delegates row rendering and actions. | Add archive state/action wiring here, not direct GraphQL. |
| `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue` | Agent/team row rendering and action buttons. | Action visibility is row-state driven. | Add archive button for inactive persisted rows only. |
| `autobyteus-web/components/workspace/history/workspaceHistorySectionContracts.ts` | Contract between panel and section. | Contains delete/terminate/select actions and pending-state functions. | Extend with archive pending/action functions. |
| `autobyteus-web/composables/useWorkspaceHistoryMutations.ts` | UI mutation intent, pending state, confirmation, toasts. | Correct owner for archive click behavior. | Add archive functions and conflict guards. |
| `autobyteus-web/stores/runHistoryStore.ts` | Frontend run-history state and GraphQL-backed actions. | Existing delete actions contain local cleanup needed after archive. | Add archive actions and reuse cleanup. |
| `autobyteus-web/stores/runHistoryStoreSupport.ts` | Shared run-history state helpers. | Already contains workspace group row-removal helpers. | Reuse for archive local hiding. |
| `autobyteus-web/graphql/mutations/runHistoryMutations.ts` | Frontend GraphQL mutation documents. | Delete mutations only. | Add archive mutations. |
| `autobyteus-server-ts/src/api/graphql/types/run-history.ts` | Agent run-history GraphQL resolver/types. | Thin delete/list boundary. | Add archive mutation result and resolver method. |
| `autobyteus-server-ts/src/api/graphql/types/team-run-history.ts` | Team run-history GraphQL resolver/types. | Thin delete/query boundary. | Add team archive mutation result and resolver method. |
| `autobyteus-server-ts/src/run-history/services/agent-run-history-service.ts` | Agent run history list/delete domain rules. | Reads metadata during list and rejects active delete. | Own archive rules/filtering for agent runs. |
| `autobyteus-server-ts/src/run-history/services/team-run-history-service.ts` | Team run history list/delete domain rules. | Reads metadata during list and rejects active delete. | Own archive rules/filtering for team runs. |
| `autobyteus-server-ts/src/run-history/store/agent-run-metadata-store.ts` | Agent metadata persistence normalization. | No archive field; normalization drops optional fields. | Add/archive normalization and preserve optional metadata. |
| `autobyteus-server-ts/src/run-history/store/team-run-metadata-store.ts` | Team metadata validation/persistence normalization. | Strict validator; no archive field; member optional context not preserved. | Allow `archivedAt`, preserve optional member context. |
| `autobyteus-server-ts/src/run-history/store/*history-index*` | History list read-model indexes. | Rows are not canonical for all metadata; rebuild derives from disk/metadata. | Do not implement archive by removing index rows. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-05-01 | Static trace | `rg -n "listWorkspaceRunHistory|deleteStoredRun|deleteStoredTeamRun|RunHistory" autobyteus-web autobyteus-server-ts/src` | Located frontend GraphQL/store/UI and backend resolver/service boundaries. | Current flow is clear enough for design; no runtime app launch required. |

## External / Public Source Findings

No external sources used.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: Not needed for design; implementation tests can use existing Vitest mocks/temp directories.
- Required config, feature flags, env vars, or accounts: None identified.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated worktree creation only.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

- Default history list is backend-authoritative; frontend projection only renders what `ListWorkspaceRunHistory` returns plus local draft rows.
- Permanent delete is intentionally destructive and already has backend active guards and safe directory deletion.
- Archive should not be implemented as frontend-only hidden state because it would not survive refresh/restart.
- Archive should not be implemented as index-row removal because that would behave like a hidden soft delete and could lose future archived-list/unarchive ability.
- Archive should not call metadata stores with raw direct GraphQL IDs until service-level validation rejects empty, traversal-like, absolute, or path-separator IDs. Existing delete safe-directory resolution is the pattern to adapt for archive.
- Metadata is already read during listing and survives index rebuilds, making `archivedAt` a durable source of truth.
- Existing metadata normalizers must be tightened to preserve optional fields before using them for archive writes.

## Constraints / Dependencies / Compatibility Facts

- Existing metadata files have no `archivedAt`; they must default to visible/unarchived (`null`).
- Existing permanent delete GraphQL API must remain unchanged.
- Team metadata validation is strict, so it must explicitly allow missing/null/string `archivedAt`.
- History services must enforce archive ID/path safety before metadata read/write. Metadata stores can still normalize valid IDs, but they must not be the only guard against traversal/absolute/path-separator input.
- Web generated GraphQL/types may need regeneration or manual update depending repository codegen workflow.
- Localization generated catalogs contain current title strings; new archive labels should be represented in English and Chinese catalogs.

## Open Unknowns / Risks

- Whether the product wants an archived history browser/unarchive action immediately. This design assumes no for the first slice and keeps it as follow-up.
- Implementation must choose exact helper shape for path-safe archive validation: either adapt existing safe directory resolution or add equivalent service-level metadata path containment/base-name checks.
- UI crowding from two inactive-row actions (archive and delete). Mitigate with hover-only compact icons and clear titles.
- If codegen cannot be run locally because the schema server is not available, generated web GraphQL artifacts may need manual alignment or documented follow-up.

## Notes For Architect Reviewer

- Key design choice: archive state belongs in per-run metadata as `archivedAt`, not in frontend-only state and not by removing index rows.
- Default list should filter archived only when inactive; active rows should remain visible even if metadata says archived, preventing hidden live work.
- Separate agent/team archive mutations avoid an ambiguous ID boundary and match existing delete boundary split.
- Refactor scope is bounded to metadata normalization and local frontend cleanup reuse; no broad run-history subsystem rewrite is recommended.
