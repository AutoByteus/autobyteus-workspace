# Investigation Notes

## Investigation Meta

- Package identifier: `workspace-history-group-archive`
- Request / ticket: Project Task from `/project_task_manager` (2026-10-08) — "Archive all runs from a sidebar group header — for standalone agents, agent teams AND agent orgs". Source request file: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-continuity-after-agent-definition-rename/tickets/in-progress/run-continuity-after-agent-definition-rename/new-ticket-request-group-archive.md` (moves to `tickets/done/...` when that ticket is delivered).
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-history-group-archive`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-history-group-archive` / `codex/workspace-history-group-archive`
- Resolved base remote / branch / revision: `origin` / `personal` / `4a51482a5ef8c678d69a3ffc995d6876fd170a2f` (fetched 2026-10-08; `origin/HEAD` → `origin/personal`)
- Finalization target remote / branch: `origin` / `personal`
- Bootstrap result: Worktree and branch created from refreshed `origin/personal`.
- Bootstrap blocker: None
- Current solution revision ID: `SR-002`
- Authorities read (requirements reading gate; file and date): `references/requirements-engineering.md` (2026-10-08); repo `AGENTS.md` (2026-10-08). Design gate: `references/architecture-design.md`, `design-principles.md`, repo `DESIGN.md`, `TESTING.md`, `autobyteus-web/AGENTS.md`, `autobyteus-server-ts/AGENTS.md` (2026-10-08)
- Investigation status: Requirements and architecture investigation complete (SR-002).

## Initial Request And Clarifications

- Original request (user, 2026-10-08): "The archive should allow me to archive on the group header itself as well. Currently, I can archive individual agent run … if I change a certain agent's name and all those are invalid anymore, I want to archive all."
- Clarifications received: "not just standalone but in general standalone agent team, and agent org … on the group header".
- User-supplied facts and constraints: should stay consistent with the sibling group-header "Reconnect" idea raised in `run-continuity-after-agent-definition-rename`.
- Initial ambiguity (open questions carried by the task): confirmation step; currently running runs; group delete; unarchive.

## Product And Domain Understanding

- Product area: AutoByteus web/desktop — Workspaces sidebar run history (`autobyteus-web/components/workspace/history/`).
- Affected actors: a user who iterates on agent/team/org packages and accumulates runs that no longer matter (e.g. after a rename).
- Existing purpose: the sidebar lists a workspace's runs grouped by agent, by team definition and by Agent Org; each persisted, not-running run row offers Archive (hide from history, data kept) and Delete (permanent, confirmed).
- Terminology: *group header* = the collapsible row that names an agent / team definition / org and shows a run count; *archive* = set `archivedAt` on the stored run so history listings skip it; files stay on disk.

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-10-08 | Code | `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue` | Group headers and per-run actions | Agent group header (lines 55–101): name, `(runs.length)` count, `+` new run. Team group header (197–231): name, activity dot, `(runs.length)`. Per-run archive only for `source==='history' && !isActive` (agent) and `!isActive && deleteLifecycle==='READY'` (team). No group action. | — |
| 2026-10-08 | Code | `.../WorkspaceAgentOrgHistoryCollection.vue` | Org group header | Org group header (7–23): name, `(runs.length)`; per-run archive/delete only when `!run.isActive`. No group action. | Sibling ticket also edits this file (merge risk) |
| 2026-10-08 | Code | `autobyteus-web/composables/useWorkspaceHistoryMutations.ts` | Archive/delete UI flow | `onArchiveRun/Team/AgentOrg` archive one run each, no confirmation, toast per run, per-id pending maps. Delete goes through `pendingDeleteTarget` confirmation dialog. | Bulk flow must not emit N toasts |
| 2026-10-08 | Code | `autobyteus-web/stores/runHistoryMutationActions.ts` | Store archive actions | Each archive calls one GraphQL mutation (`archiveStoredRun` / `archiveStoredTeamRun` / `archiveStoredAgentOrgRun`), cleans local state (contexts, selection), then `refreshTreeQuietly()` — one full refresh per run. | Bulk must avoid N refreshes |
| 2026-10-08 | Code | `autobyteus-server-ts/src/run-history/services/agent-run-history-service.ts` `listRunHistory(limitPerAgent=6)` | Does a standalone group show all runs? | **No.** Skips archived rows, then keeps only the 6 newest runs per agent per workspace. The header count `(N)` is the capped visible count. | Requirement decision DEC-001 |
| 2026-10-08 | Code | `.../team-run-history-service.ts` `listTeamRunHistory()`; `.../collaboration-root-history-service.ts` `list()` | Team / org listing | Team and org runs are not capped. Archived runs are hidden **unless still active** (`row.archivedAt && !active`). | — |
| 2026-10-08 | Code | `.../agent-run-history-catalog-service.ts` `setArchiveState`; `.../team-run-history-catalog-service.ts` `setArchived`; `.../agent-org-run-history-catalog-service.ts` `archiveStored` | Archive semantics and guards | Archive refuses active runs ("Run is active. Terminate it before archiving history."), keeps data, sets `archivedAt`. Team/org writes are transactional with readback and restore. | Running runs cannot be archived without stopping |
| 2026-10-08 | Command | `grep -rn -i unarchive` across repo | Is there an unarchive path? | `unarchiveRun` / `unarchiveTeamRun` exist in catalog services only (team one exercised by integration tests). No GraphQL mutation, no UI, no org unarchive, no "archived runs" view. | Unarchive is a new capability if wanted (DEC-004) |
| 2026-10-08 | Code | `autobyteus-web/utils/runTreeProjection.ts` (`source: 'history' \| 'local' \| 'draft'`) | What rows live in an agent group | Agent groups may also contain unsent drafts and local (not yet persisted) runs. These are not archivable history. | Excluded from archive (REQ-004) |
| 2026-10-08 | Doc | Sibling ticket `run-continuity-after-agent-definition-rename` requirements/design (worktree `codex/run-continuity-after-agent-definition-rename` @ `5a2e38b00`) | Group-header Reconnect consistency | No group-header Reconnect is specified or implemented there; it exists only as a mention in `new-ticket-request-group-archive.md`. That branch changes `WorkspaceAgentOrgHistoryCollection.vue` (row names). | Consistency = follow existing header/row action conventions; note merge overlap |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger | Current Supported Product Behavior Path | Current Outcome / Invariants | Evidence | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Click archive icon on one run row (agent, team or org) | Hover row → archive icon → run disappears, toast "archived" | One run archived; only stopped, persisted runs; no confirmation; data kept on disk | `WorkspaceHistoryWorkspaceSection.vue`, `useWorkspaceHistoryMutations.ts` | High |
| BEH-002 | User | Group header | Header only expands/collapses; agent header also has `+` new run | No group-level archive (or delete) | same | High |
| BEH-003 | System | History listing | Standalone groups show ≤6 newest unarchived runs per agent per workspace; teams/orgs uncapped; archived runs hidden unless still active | Count shows visible runs | `agent-run-history-service.ts:61–110` | High |
| BEH-004 | User | Per-run delete | Confirmation dialog → permanent delete | Irreversible | `useWorkspaceHistoryMutations.ts:99–227` | High |
| BEH-005 | User | — | No way to see or restore archived runs in the app | Archive is effectively one-way in the UI | grep result above | High |

## Relevant Codebase And Technical Facts

| Path / Component | Current Responsibility | Requirement Implication | Architecture Question |
| --- | --- | --- | --- |
| `WorkspaceHistoryWorkspaceSection.vue` | Renders agent and team group headers and rows | Needs an "Archive all" header action for agent and team groups | Where the header action and its pending state live |
| `WorkspaceAgentOrgHistoryCollection.vue` | Org group header and rows | Same for org groups | Same; merge with sibling branch |
| `useWorkspaceHistoryMutations.ts` | Per-run archive/delete flows, delete confirmation | Bulk archive needs confirmation + one summary toast | Extend or add a group-archive owner |
| `runHistoryMutationActions.ts` | Per-run GraphQL + local cleanup + refresh | Bulk needs per-run cleanup but one refresh | Batch shape |
| `agent-run-history-service.ts` (limit 6) | Caps visible standalone runs | If "all" means all stored runs, the client does not know the hidden runs | Server-side group archive vs. client-side loop over a full list |
| Catalog services (agent/team/org) | Per-run archive with active-run guard | Running runs are refused | Reuse per-run archive per member of the group |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- Stored run catalogs/indexes and team/org execution trees (`archivedAt` field). Readers: history listing services; writers: catalog services.

### Structural Surfaces

- GraphQL mutations `archiveStoredRun`, `archiveStoredTeamRun`, `archiveStoredAgentOrgRun`; web store mutation actions; sidebar components.

### Potential Structural Impacts To Investigate

- API change: likely, if hidden standalone runs must be included (DEC-001 option A).
- Persistence schema change: none expected (same `archivedAt` field).
- Concurrency: archiving many runs while one is starting/restoring — existing per-run guards apply.
- Confirmed absent: unarchive API, archived view.

## Runtime, Probe, Or Reproduction Findings

N/A — code evidence is sufficient for requirements; no runtime probe run.

## Stakeholder And User Evidence

| Source | Need | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| User 2026-10-08 | Clear out all runs of a renamed/removed agent (and team/org) in one step from the group header | Direct request | UC-001..UC-003 | DEC-001..DEC-005 |

## External Contracts, Standards, And Dependencies

None beyond the internal GraphQL API.

## Persisted Data And State Facts

- Affected: `archivedAt` on stored agent run rows and team/org execution trees + index rows.
- Preserve: run files, history, conversations (archive never deletes).
- Acceptable loss: none.
- Volume: a group may hold dozens of runs; standalone groups may have more stored runs than the 6 shown.

## Product Design Request Context

- Product Design request in the current input: `Not stated`. The feature reuses existing sidebar icon/confirmation patterns.

## Product Design Findings

N/A — not applicable.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related IDs | Status | Approval |
| --- | --- | --- | --- | --- | --- | --- |
| `.../run-continuity-after-agent-definition-rename/.../new-ticket-request-group-archive.md` | Solution Designer (sibling ticket) | Origin request | Request text | All | Final | Not behavior-defining |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| RSK-001 | Risk | Sibling branch edits `WorkspaceAgentOrgHistoryCollection.vue` | Merge conflict | Delivery rebases on whichever lands first | Open |
| RSK-002 | Risk | No unarchive UI exists, so a bulk mistake is not recoverable in-app | Bulk scale magnifies a mis-click | Confirmation (DEC-002); unarchive decision DEC-004 | Open |

## Architecture Investigation Findings

| Date | Source | Observation | Design implication |
| --- | --- | --- | --- |
| 2026-10-08 | `autobyteus-web/stores/runHistoryStore.ts:388–422` | Per-run `archiveRun/archiveTeamRun/archiveAgentOrgRun` = mutation-action + `refreshRunNavigationTopology` | Group actions call topology refresh once |
| 2026-10-08 | `autobyteus-web/stores/runHistoryMutationActions.ts` | Each per-run action: GraphQL mutation → local cleanup → `refreshTreeQuietly()` | Extract mutation+cleanup core; refresh once per group |
| 2026-10-08 | `autobyteus-web/stores/runHistoryLoadActions.ts:94+` `fetchRunHistoryTree` | Refreshes workspace and Agent Org branches together | One refresh covers all kinds |
| 2026-10-08 | `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue:89–118, 236–275` | Panel hosts `ConfirmationModal`s and wires `useWorkspaceHistoryMutations` with store functions, toast and org route cleanup | Add a sibling composable + modal with the same wiring style |
| 2026-10-08 | `autobyteus-web/utils/runTreeProjection.ts:348–415` | Org groups are a client projection: workspace = `normalizeRootPath(defaultLaunchConfiguration.workspaceRootPath)` or `NO_WORKSPACE`, keyed by `orgDefinitionId` | Do not re-derive org grouping on the server; client passes ids |
| 2026-10-08 | `autobyteus-server-ts/src/run-history/services/workspace-run-history-service.ts` `groupTeamRunsByDefinition` | Team groups keyed `teamDefinitionId || teamDefinitionName || teamRunId`; uncapped | Client has all team run ids |
| 2026-10-08 | `autobyteus-server-ts/src/run-history/services/agent-run-history-service.ts` | Has `catalogService`, `statusProjectionService`; groups by `canonicalizeWorkspaceRootPath` (`../utils/workspace-path-normalizer.js`) + `agentDefinitionId` | New `archiveStoredAgentRunGroup` here, same key |
| 2026-10-08 | `autobyteus-server-ts/src/api/graphql/types/run-history.ts:237–330` | `RunHistoryResolver.archiveStoredRun` wraps service | Add sibling mutation + result type |
| 2026-10-08 | `autobyteus-server-ts/tests/e2e/workspaces/archive-run-history-graphql.e2e.test.ts`, `tests/unit/run-history/services/agent-run-history-service.test.ts` | Existing archive tests | Extend for group archive |


## Requirement Implications

- The 6-run cap means "archive all" is ambiguous; the user's scenario (renamed agent, all runs invalid) favours archiving every stored run of the group, not just the visible ones.
- Running runs cannot be archived by the backend; the feature must skip them or stop them first.
- Because there is no unarchive in the app, a confirmation step is prudent for a bulk action.

## Notes For Architecture Design

See `design-spec.md` (SR-002). Approved scenarios SCN-001..SCN-003.
