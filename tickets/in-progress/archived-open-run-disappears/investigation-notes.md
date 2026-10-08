# Investigation Notes

## Investigation Meta

- Package identifier: `archived-open-run-disappears`
- Request / ticket: Project Task from `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), 2026-10-08 — "Archived run that is open in the middle area must disappear". Origin: delivery open point 3 of `workspace-history-group-archive` (receipt `/Users/normy/autobyteus_org/autobyteus-worktrees/ticket-receipts/workspace-history-group-archive-terminal.md`; package `tickets/done/workspace-history-group-archive/`).
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/archived-open-run-disappears`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/archived-open-run-disappears` / `codex/archived-open-run-disappears`
- Resolved base remote / branch / revision: `origin` / `personal` / `3a2496c95b16b0f7e0cedc7afdf615ada00b2267` (fetched 2026-10-08)
- Finalization target remote / branch: `origin` / `personal`
- Bootstrap result: Worktree and branch created from refreshed `origin/personal`.
- Bootstrap blocker: None
- Current solution revision ID: `SR-003`
- Authorities read (requirements reading gate; file and date): `references/requirements-engineering.md` (2026-10-08); repo `AGENTS.md` (2026-10-08). Design gate: `references/architecture-design.md`, `design-principles.md`, repo `DESIGN.md`, `TESTING.md`, `autobyteus-web/AGENTS.md` (2026-10-08)
- Investigation status: Requirements and architecture investigation complete (SR-003).

## Initial Request And Clarifications

- Original request: archiving a run that is open in the middle area leaves it open and it comes back in the Workspaces sidebar as a `local` row, so the archive looks like it failed. User (2026-10-08): "I thought why the archive failed. Is it because like it's opening in the middle area?" Expected: "it should disappear".
- User-supplied expectations (from the task): archived run leaves the sidebar and never returns as `local`; an open archived run closes to a neutral state (workspace/empty view), never jumps to an unrelated agent; applies to standalone agent, team (incl. member views) and Agent Org; running runs stay protected ("Stop running runs first."); archived runs stay hidden after reload/restart.
- Initial ambiguity: what "neutral state" is for a standalone chat; what happens when an archived run's route is opened later (reload/link); whether Delete (same cleanup path) gets the same close behavior.

## Product And Domain Understanding

- Product area: AutoByteus web/desktop — Workspaces sidebar run history and the middle area (run views).
- Run views: standalone agent runs open at `/chat?id=<runId>`; team runs (and member views) open on `/workspace` via the selection store; Agent Org runs open at `/workspace?rootSubjectKind=agent_org&orgRunId=…`.
- Sidebar row sources: `history` (saved, listed by server), `draft` (`temp-*`), `local` (any loaded agent context not in the server listing).

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-10-08 | Doc | `tickets/done/workspace-history-group-archive/api-e2e-test-case-ledger.md` seq 7, 8, 9, 10; `api-e2e-execution-coverage-report.md` Observations 3 | Prior live evidence | Agent: after per-run and group archive of the open run, route stays on `#/chat?id=<runId>`, the view re-hydrates and a `local` row appears; persists after reload. Server index shows `archivedAt` set, run dirs kept. Org: route left to `#/workspace`. Team: archived while not open (no open-team observation). | — |
| 2026-10-08 | Code | `autobyteus-web/stores/runHistoryMutationActions.ts` `cleanupStoredRunLocalState`, `cleanupStoredTeamRunLocalState`, `cleanupStoredAgentOrgRunLocalState` | What archive does on the client | After a successful mutation: drop resume config, remove from `workspaceGroups`, remove agent/team context, clear selection; Org: drop history row, release context. Same cleanup used by Delete. | — |
| 2026-10-08 | Code | `autobyteus-web/pages/chat.vue` (watch "A displayed run that disappears … is re-resolved", `ensureRunOpen`) | Why the agent run comes back | When the displayed context disappears while the route still has its id, chat page calls `openWorkspaceExecutionLink({kind:'agent', runId})` again. The server still serves an archived run, so the context is re-created. | Root cause of agent case |
| 2026-10-08 | Code | `autobyteus-web/stores/runHistoryReadModel.ts:246–282` | Where `local` rows come from | Every loaded agent context not in the server listing becomes a `local` row (`temp-*` → `draft`). Re-created archived context → `local` row. | — |
| 2026-10-08 | Code | `autobyteus-web/services/runOpen/agentRunOpenCoordinator.ts`; server `agent-run-resume-config-service.ts:45–66`; `run-history/domain/run-model-config.ts:37–50` | Does open refuse archived runs? | No. Server resume config succeeds for archived runs and reports `modelConfigEditability.reason = 'RUN_ARCHIVED'`; the client does not act on it. | Client can detect archived on open |
| 2026-10-08 | Code | `autobyteus-web/stores/agentContextsStore.ts:136–153` `removeRun` | Jump risk | If the removed run was selected and other agent contexts exist, it auto-selects the first other agent run ("Auto-select another agent run"). | Unrelated-agent jump |
| 2026-10-08 | Code | `autobyteus-web/stores/agentTeamContextsStore.ts:60–73` `removeTeamContext` | Team close behavior | If the removed team was selected and another team context is loaded, it selects that team; otherwise clears selection (→ empty state). | Unrelated-team jump |
| 2026-10-08 | Code | `autobyteus-web/components/layout/WorkspaceAdaptiveLayout.vue` | Neutral state | With no selection and no Org route, `/workspace` shows the empty state ("Choose agent or team" / "Open runs history"). | Candidate neutral state |
| 2026-10-08 | Code | `WorkspaceAgentRunsTreePanel.vue` `leaveRemovedAgentOrgRoute`; `useWorkspaceHistoryMutations.ts` `onArchiveAgentOrg`; `useWorkspaceHistoryGroupArchive.ts` `leaveArchivedAgentOrgRoutes`; `useWorkspaceHistorySubjectActions.ts:65` | Org close behavior | Per-run and group Org archive replace the open Org route with `/workspace`; opening an Org clears run selection, so the result is the empty state. | Org already correct (live seq 10) |
| 2026-10-08 | Code | `autobyteus-web/composables/workspace/useWorkspaceRouteSelection.ts` | Team reload behavior | Team execution-link query is stripped after open; selection lives in memory. Reload of `/workspace` cannot re-open the archived team. | Team does not reappear |
| 2026-10-08 | Code | `autobyteus-web/electron/application/electronApplication.ts:88–100` | Restart behavior | App start loads the renderer index (no saved route). Window reload keeps the current hash route. | Reload is the risky case |
| 2026-10-08 | Code | server `agent-run-history-service.ts`, `team-run-history-service.ts:57`, `collaboration-root-history-service.ts:63` | Server listings | Archived agent runs are skipped; archived team/org runs are hidden unless still active. | Server side already correct |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Archive (row icon or group "Archive all") of a standalone agent run that is open in Chat | Archive saved on server → client removes context and clears selection (or auto-selects another loaded agent run) → chat page sees its displayed run vanish and re-opens it by id → context re-created → `local` row | Run stays open; sidebar shows `local` row; persists after window reload (route still has the id) | Live seq 7/8; `chat.vue`; `runHistoryReadModel.ts` | High |
| BEH-002 | User | Archive of a team run that is open (team or member view) | Context removed; if another team context is loaded, that team is selected, otherwise empty state | No reappearance; possible jump to an unrelated team | `agentTeamContextsStore.ts:60–73`; no live observation of the open case | Medium (code only) |
| BEH-003 | User | Archive of an Agent Org run that is open | Org route replaced with `/workspace` → empty state | Already disappears | Live seq 10; code | High |
| BEH-004 | User | Archive while the run (or a group member) is running | Refused; "Stop running runs first." (group) / row action hidden for active runs | Nothing archived | prior ticket, server guards | High |
| BEH-005 | System | Window reload / app restart | Reload keeps the hash route; restart loads the default route; contexts are in memory only | Agent archived-open run reappears after reload | electron start URL; live seq 7 note | High |
| BEH-006 | User | Delete of an open run (same client cleanup) | Same cleanup and auto-select; chat page re-open fails → "chat missing" state | Not a `local` row, but may jump / show missing state | `runHistoryMutationActions.ts`, `chat.vue` | Medium |

## Relevant Codebase And Technical Facts

| Path / Component | Current Responsibility | Requirement Implication | Architecture Question |
| --- | --- | --- | --- |
| `pages/chat.vue` | Route-bound standalone run view; re-opens a vanished run | Must not re-open an archived run | Who decides "closed because archived" vs "re-key/promotion" |
| `stores/runHistoryMutationActions.ts` | Archive/delete client cleanup | Central point to close the open view | Where navigation to the neutral state belongs |
| `stores/agentContextsStore.ts` `removeRun`, `stores/agentTeamContextsStore.ts` `removeTeamContext` | Auto-select another run on removal | Must not jump to an unrelated run on archive | Change policy globally or only for archive/delete |
| `services/runOpen/agentRunOpenCoordinator.ts` + resume config `RUN_ARCHIVED` | Opens runs by id | Archived run opened by stale route must not become a `local` row | Use `RUN_ARCHIVED` to refuse/redirect |
| `stores/runHistoryReadModel.ts` | Builds `local` rows from contexts | Archived run must never be a `local` row | Guard at projection vs. at open |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- None changed expected. `archivedAt` on stored rows is already written correctly.

### Structural Surfaces

- Web: chat page, run-history mutation actions, agent/team context stores, run open coordinator, sidebar projection. Server: none expected (resume config already reports `RUN_ARCHIVED`).

### Potential Structural Impacts To Investigate

- API change: none expected. Persistence: none. Concurrency: archive racing with a run (re)open; route changes during archive. Ownership: who owns "close the open view" after archive/delete.

## Runtime, Probe, Or Reproduction Findings

| Method | Scenario | Observation | Requirement Implication | Evidence Path |
| --- | --- | --- | --- | --- |
| Prior live isolated desktop (API-E2E of `workspace-history-group-archive`) | Agent group archive and per-run archive of the open run | Route stays; view re-hydrates; `local` row; persists after reload; server index `archivedAt` set | Confirms "archive saved, client keeps showing it" | `tickets/done/workspace-history-group-archive/api-e2e-evidence/live-04b-agent-group-archived-open-run.png`, `live-06-per-run-archive-open-run.png`, `live-index-after-agent-archives.json` |
| Same | Org group archive with Org route open | Route → `#/workspace` | Org already correct | `live-03b-org-archived-route-left.png` |
| — | Team archived while open | Not observed live | Verify downstream | — |

## Stakeholder And User Evidence

| Source | Need | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| User 2026-10-08 | Archive must visibly succeed; "it should disappear" | Direct | REQ-001..REQ-004 | DEC-001..DEC-003 |

## External Contracts, Standards, And Dependencies

None beyond the internal GraphQL API (unchanged).

## Persisted Data And State Facts

- Affected stored subject: none. Archive already sets `archivedAt` and keeps run data; this ticket changes only client view/sidebar behavior.

## Product Design Request Context

- Product Design request in the current input: `Not stated`.

## Product Design Findings

N/A — not applicable.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related IDs | Status | Approval |
| --- | --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/ticket-receipts/workspace-history-group-archive-terminal.md` | Solution Designer | Origin open point 3 | Background | All | Final | Not behavior-defining |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| UNK-001 | Unknown | Team open-run archive not observed live | BEH-002 is code-derived | API/E2E live check | Open |
| RSK-001 | Risk | Changing `removeRun`/`removeTeamContext` auto-select could affect other close paths (e.g. closing a draft) | Preserved behavior | Architecture decides scope of the change | Open |

## Architecture Investigation Findings

| Date | Source / Command | Observation | Design implication |
| --- | --- | --- | --- |
| 2026-10-08 | `grep "\.removeRun(\|removeTeamContext(\|releaseContext("` (web, non-test) | `removeRun` callers: `runHistoryMutationActions.ts:61` (archive/delete) and `agentRunStore.ts:515` `closeAgent` (only caller `WorkspaceAgentRunsTreePanel.vue:281`, draft removal). `removeTeamContext`: only `runHistoryMutationActions.ts:98` | Removing auto-select is bounded |
| 2026-10-08 | `stores/agentContextsStore.ts` (`runs.delete` at 142, 173) | Persisted contexts vanish only via `removeRun`; promotion re-keys the same object | Chat vanish ⇒ removed (archive/delete) |
| 2026-10-08 | `stores/runHistoryTeamMemberInspectionActions.ts:89`, `services/runOpen/teamRunOpenCoordinator.ts:74,142` | Member views select `team:<rootTeamRunId>` | Team fix covers member views |
| 2026-10-08 | `services/runOpen/agentRunOpenCoordinator.ts`; callers `runHistoryLoadActions.ts:414`, `workspaceNavigationService.ts:114`, `activeRunRecoveryCoordinator.ts:96` | Single projection owner; recovery opens active runs | Safety net in coordinator, limited to archived **and stopped** |
| 2026-10-08 | server `run-model-config.ts:37–50`; web `runHistoryQueries.ts` `modelConfigEditability { editable reason }`; `runHistoryTypes.ts:70` | `reason === 'RUN_ARCHIVED'` iff catalog row has `archivedAt` | No API change |
| 2026-10-08 | `utils/projects/taskRootPresentation.ts:28–53`, `docs/projects.md` "Task root line" | Task roots openable only when the host run is in the server history listing (not local contexts) | Projects cannot open archived hosts; earlier claim to the user ("no in-app link to an archived run") holds |
| 2026-10-08 | grep `useRouter()` in `stores/`, `services/` | None | Navigation stays in `pages/chat.vue` |
| 2026-10-08 | `stores/__tests__/agentContextsStore.spec.ts:141`, `stores/__tests__/agentTeamContextsStore.spec.ts:136` | Specs assert the auto-select | Update in scope |

## Requirement Implications

- The server already saves the archive (confirmed by live index evidence); the defect is client-only.
- Standalone agent runs are affected (reappear as `local`, also after reload). Team runs do not reappear but can jump to another loaded team. Org runs already close correctly.
- The client can tell an opened run is archived (`RUN_ARCHIVED`), so a stale route can be handled without server changes.

## Notes For Architecture Design

See `design-spec.md` (SR-003). Approved scenarios SCN-001..SCN-006.
