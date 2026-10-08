# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-003`
- Approved requirements baseline / revision and user-approval reference: `requirements-doc.md` at SR-002, approved by the user on 2026-10-08 ("I think it's now approved." / "Your recommended approach is reasonable."), with DEC-001 = A (workspace empty view), DEC-002 = A (safety net: stale address shows the empty view), DEC-003 = A (Delete gets the same close behavior).
- Behavior-defining supplements and their approval references: None
- Design status: `Ready`
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/archived-open-run-disappears/tickets/in-progress/archived-open-run-disappears/investigation-notes.md`
- Authorities read (design reading gate; 2026-10-08): `references/architecture-design.md`, `design-principles.md`, project `DESIGN.md` (repo root), `TESTING.md`, `autobyteus-web/AGENTS.md`. `design-examples.md` not needed.
- Project design-principle conflicts or discrepancies: None.

## Current-State Read

Archive and Delete of a stored run run through `runHistoryStore` → `runHistoryMutationActions.ts`. After the server confirms, a per-kind cleanup (`cleanupStoredRunLocalState`, `cleanupStoredTeamRunLocalState`, `cleanupStoredAgentOrgRunLocalState`) removes the run's loaded context and selection, then the history tree is refreshed. The server side is correct (archived runs are skipped by listings; data kept).

The middle area is route- and selection-driven:

- Standalone agent runs: `/chat?id=<runId>` (`pages/chat.vue`). Chat has a watcher: "a displayed run that disappears is re-resolved" — it calls `openWorkspaceExecutionLink({kind:'agent'})` again. For an archived run the server still serves the run, so `openAgentRun` re-creates the context and `runHistoryReadModel` lists it as a `local` row (BEH-001). For a deleted run the reopen fails → "chat not found" page (BEH-006).
- Team runs (incl. member views): `/workspace` + selection `team:<teamRunId>`. `agentTeamContextsStore.removeTeamContext` selects *another loaded team* if one exists (BEH-002).
- Standalone agent: `agentContextsStore.removeRun` likewise auto-selects *another loaded agent run*.
- Agent Org runs: `WorkspaceAgentRunsTreePanel.leaveRemovedAgentOrgRoute` replaces the Org route with `/workspace` after per-run/group archive and delete; opening an Org already clears selection → empty state (BEH-003, correct).

Constraints: stores/services never navigate (navigation lives in pages/components/composables); the only callers that remove a *persisted* agent context are the archive/delete cleanups; `removeTeamContext` has no other caller; `removeRun`'s only other caller is `agentRunStore.closeAgent` (draft removal, `temp-*` ids). Evidence: investigation notes, Architecture Investigation Findings.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Small`
- Size rationale: four web source files in existing owners (`pages/chat.vue`, `stores/agentContextsStore.ts`, `stores/agentTeamContextsStore.ts`, `services/runOpen/agentRunOpenCoordinator.ts`) plus their colocated specs. No server, GraphQL, persistence or new owner.
- Architectural risk: `Low`
- Risk rationale: no contract, persistence, security, deployment or ownership-boundary change. The behavior change is bounded to the on-screen outcome when a selected/displayed run is removed; the two auto-select branches being removed have no caller outside archive/delete and draft close (whose visible outcome on `/chat` is route-driven and unchanged). The safety net reads an existing contract field (`modelConfigEditability.reason = 'RUN_ARCHIVED'`).
- Escalation trigger: if implementation finds another production caller that relies on `removeRun`/`removeTeamContext` auto-selecting a run, or another path that removes a persisted agent context while it is displayed, stop and return a Design Impact.

## Architecture Investigation Evidence

| Source | Exact Path | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Code | `autobyteus-web/pages/chat.vue` (watch on `displayedContext`, `ensureRunOpen`) | Re-opens a vanished displayed run | Replace re-open with "leave to workspace" | — |
| Code | `stores/runHistoryReadModel.ts:246–282` | Any loaded non-temp agent context missing from history = `local` row | Fix by never re-creating the context, not by filtering rows | — |
| Code | `stores/agentContextsStore.ts:136–153`, `stores/agentTeamContextsStore.ts:60–73` | Auto-select another loaded run on removal | Remove auto-select; clear selection | — |
| Command | `grep "\.removeRun(\|removeTeamContext("` in `autobyteus-web` (non-test) | `removeRun`: archive/delete cleanup + `agentRunStore.closeAgent` (drafts only, `WorkspaceAgentRunsTreePanel.vue:281`). `removeTeamContext`: archive/delete cleanup only | Blast radius of the auto-select removal is bounded | — |
| Code | `agentContextsStore.ts` (`runs.delete` only in `removeRun` and `promoteTemporaryId`) | A persisted context vanishes only through archive/delete; promotion keeps the same object | Chat watcher can treat "displayed persisted run vanished (not promoted)" as removed | — |
| Code | `stores/runHistoryTeamMemberInspectionActions.ts:89`, `services/runOpen/teamRunOpenCoordinator.ts:74,142` | Member views select `team:<rootTeamRunId>` | Team fix covers member views | — |
| Code | server `run-history/domain/run-model-config.ts:37–50`; `agent-run-resume-config-service.ts:45–66`; web `graphql/queries/runHistoryQueries.ts` (`modelConfigEditability { editable reason }`) | Resume config already reports `reason: 'RUN_ARCHIVED'` exactly when the catalog row has `archivedAt` | Safety net needs no API change | — |
| Code | `utils/projects/taskRootPresentation.ts:28–53`; `docs/projects.md` "Task root line" | Project Task roots are openable only when the host run is in the server history listing | Projects cannot open an archived host; no Projects change | — |
| Code | `services/runRecovery/activeRunRecoveryCoordinator.ts:96`, `stores/runHistoryLoadActions.ts:414`, `services/workspace/workspaceNavigationService.ts:114` | Other `openAgentRun` callers (recovery of active runs, history-row click, links) | Safety net refuses only archived **and stopped** runs so no live run is hidden | — |
| Code | `stores` / `services` grep for `useRouter()` | None | Navigation stays in `pages/chat.vue` | — |
| Prior live evidence | `tickets/done/workspace-history-group-archive/api-e2e-*` seq 7, 8, 10 | Agent reappears (also after reload); Org route left correctly | Org unchanged; agent fix needed | Team open case not observed live (UNK-001) |

## Intended Change

1. **Removing a run never selects another run.** `agentContextsStore.removeRun` and `agentTeamContextsStore.removeTeamContext` clear the selection when the removed run was selected, instead of selecting the first other loaded run. Team (and member) views therefore fall to the existing `/workspace` empty state.
2. **Chat leaves a removed run instead of re-opening it.** When the run displayed on `/chat?id=<runId>` loses its context (and it was not a temp→permanent promotion), Chat clears the selection and replaces the route with `/workspace` (empty state). This covers per-run archive, "Archive all" and Delete of an open standalone run.
3. **Safety net for stale addresses.** `openAgentRun` refuses to project a run whose resume config says it is archived and stopped, by throwing `ArchivedAgentRunOpenError` before committing any context. Chat's `ensureRunOpen` maps that error to the same "leave to workspace". Other callers treat it like any open failure.
4. **Org: unchanged** (already correct; regression-tested).

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Requirement / AC | Trigger | Existing Behavior | Approved Change / Preserved | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-001..003, REQ-006; AC-001, AC-002, AC-007 | Row Archive / agent "Archive all" while the run is open in Chat | Re-opened → `local` row | Leaves to `/workspace` empty state; no row | DS-001 |
| BEH-002 | User | REQ-001..003, REQ-006; AC-003 | Row Archive / team "Archive all" while team or member view open | May select another team | Empty state; no other team selected | DS-002 |
| BEH-003 | User | AC-004 | Org archive while Org open | Route → `/workspace` | Preserved | DS-004 (unchanged) |
| BEH-004 | User | REQ-005; AC-006 | Archive with running run(s) | Refused | Preserved (no code change) | — |
| BEH-005 | System | REQ-004, REQ-008; AC-005, AC-008 | Window reload / app restart / browser Back to a stale chat address | Reload re-opens archived run as `local` | Route already moved away; stale address → empty view, no context | DS-003 |
| BEH-006 | User | REQ-007, REQ-006; AC-009 | Delete (confirmed) while the run is open | Agent: "chat not found" / possible jump; Team: possible jump; Org: `/workspace` | Same as archive: empty state, no jump | DS-001, DS-002, DS-004 |

## Relevant Supplemental Task Artifacts

None.

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix`
- Current design issue found: `Yes`
- Structural triggers:
  - *Duplicated policy / coordination* — fires weakly: "what to show after the shown run is removed" is decided in three places (agent context store auto-select, team context store auto-select, chat re-resolve), and they disagree with the Org path. The design removes the two auto-select policies and the re-open policy, leaving one rule per route-bound view: Chat (agent) leaves to `/workspace`; Org leaves to `/workspace` (existing panel callback); Team view is selection-driven, so cleared selection = empty state.
  - *Authoritative boundary* — ruled out: no caller bypasses a boundary; stores do not navigate.
  - *Shared-structure looseness* — ruled out: no new shared type beyond one error class.
  - *Empty indirection* — avoided: no new "run removal navigation service"; it would only forward to `router.replace`.
- Root cause classification: `Missing Invariant` — "a run removed from history closes its view and nothing else is opened in its place" is not enforced: Chat re-opens and the context stores pick an unrelated run.
- Refactor needed now: `No` (beyond removing the obsolete branches below)
- Evidence: see Architecture Investigation Evidence.
- Design response: enforce the invariant in the existing owners (context stores own selection on removal; Chat owns its route; the open coordinator owns "may this run be projected").
- Refactor rationale: owners are correct; only their removal policies are wrong.
- Intentional deferrals and residual risk: the Org "leave route" stays in the panel callback while the agent equivalent lives in Chat. Unifying them would require moving Org route ownership into `AgentOrgWorkspaceView` and is not needed for correctness. Residual risk: low (two owners, both producing the same `/workspace` outcome).

## Terminology

- *Leave to workspace*: clear the run selection and `router.replace({ path: '/workspace' })`, which renders the existing workspace empty state ("Choose agent or team" / "Open runs history").
- *Archived and stopped*: resume config with `modelConfigEditability.reason === 'RUN_ARCHIVED'` and `isActive === false`.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Removed in this change: the auto-select-another-run branches in `removeRun` and `removeTeamContext`; Chat's "re-resolve a vanished displayed run" re-open behavior. No dual path is kept.

## Persisted Data / State Transition Decision

- Decision: `Not Affected` — client navigation/selection only. Archive still only sets `archivedAt`; Delete is unchanged.

## Data-Flow Spine Inventory

| Spine ID | Scope | Behavior IDs | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, BEH-006 | Sidebar Archive / Archive all / Delete on an agent run open in Chat | `/workspace` empty state, no row | `pages/chat.vue` (route), `runHistoryMutationActions` (cleanup) | The reported bug |
| DS-002 | Primary End-to-End | BEH-002, BEH-006 | Sidebar Archive / Archive all / Delete on an open team run | Empty state, no other team | `agentTeamContextsStore` (selection on removal) | No unrelated jump |
| DS-003 | Primary End-to-End | BEH-005 | Chat route opened with an archived run id (reload / Back) | `/workspace` empty state, no context | `agentRunOpenCoordinator` + `pages/chat.vue` | Safety net |
| DS-004 | Primary End-to-End | BEH-003, BEH-006 | Org archive/delete while Org open | `/workspace` | `WorkspaceAgentRunsTreePanel` callback | Preserved |

## Primary Execution Spine(s)

- DS-001: `Sidebar row/header action → useWorkspaceHistoryMutations / useWorkspaceHistoryGroupArchive → runHistoryStore.archiveRun|archiveAgentRunGroup|deleteRun → GraphQL mutation (server sets archivedAt / deletes) → cleanupStoredRunLocalState → agentContextsStore.removeRun (clears selection) → chat.vue displayed-context watcher → leave to workspace → WorkspaceAdaptiveLayout empty state`
- DS-002: `Sidebar action → … → runHistoryStore.archiveTeamRun|archiveTeamRuns|deleteTeamRun → GraphQL → cleanupStoredTeamRunLocalState → agentTeamContextsStore.removeTeamContext (clears selection) → WorkspaceAdaptiveLayout empty state`
- DS-003: `Reload / Back to /chat?id=X → chat.vue ensureRunOpen → openWorkspaceExecutionLink → openAgentRun → loadRunContextHydrationCandidate (resume config: RUN_ARCHIVED, inactive) → throw ArchivedAgentRunOpenError (no context committed) → chat.vue leave to workspace`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Server confirms; cleanup removes the context; the context store clears selection; Chat sees its displayed persisted run vanish (not a promotion) and leaves to `/workspace`; history refresh no longer lists the run and no context exists, so no `local` row | mutation action, context store, chat page | chat page (route) | toast (unchanged), history refresh (unchanged) |
| DS-002 | Server confirms; cleanup removes the team context; store clears selection; layout shows empty state on `/workspace` | mutation action, team context store, layout | team context store | topology refresh (unchanged) |
| DS-003 | Chat asks to open the run; the coordinator loads resume config, sees archived & stopped, throws before committing; Chat leaves to `/workspace` | chat page, open coordinator | open coordinator (projection admission) | — |

## Spine Actors / Main-Line Nodes

`pages/chat.vue`; `stores/runHistoryMutationActions.ts` (unchanged); `stores/agentContextsStore.ts`; `stores/agentTeamContextsStore.ts`; `services/runOpen/agentRunOpenCoordinator.ts`.

## Ownership Map

- `pages/chat.vue`: owns the `/chat` route ↔ displayed run; now also "displayed persisted run removed or not openable because archived → leave to workspace".
- `agentContextsStore` / `agentTeamContextsStore`: own loaded contexts and the selection consequence of removing one — now "clear, never substitute".
- `agentRunOpenCoordinator.openAgentRun`: owns whether and how a stored agent run is projected into a loaded context — now refuses archived & stopped runs.
- `runHistoryMutationActions`: unchanged (mutation + cleanup + refresh).

## Thin Entry Facades / Public Wrappers

N/A — none added.

## Removal / Decommission Plan (Mandatory)

| Item | Why Unnecessary | Replaced By | Scope | Notes |
| --- | --- | --- | --- | --- |
| `agentContextsStore.removeRun` auto-select of `remainingRunIds[0]` | Causes unrelated jump (REQ-002) | `selectionStore.clearSelection()` | In This Change | Update `agentContextsStore.spec.ts` "should auto-select another runContext…" |
| `agentTeamContextsStore.removeTeamContext` select-next-team | Same | `selection.clearSelection()` | In This Change | Update `agentTeamContextsStore.spec.ts` |
| `chat.vue` re-open of a vanished displayed run | Re-creates archived runs; shows "chat not found" after delete | Leave to workspace | In This Change | `ensureRunOpen` itself stays for initial/route-change opens |

## Return Or Event Spine(s)

N/A — synchronous store reactivity only.

## Bounded Local / Internal Spines

`chat.vue` displayed-context watcher: `displayedContext: ctx → null` → if `previous.state.runId === routeRunId` (not promoted) and route id is not temporary → leave to workspace. Temp ids keep today's behavior (route back to `/chat` New chat via `ensureRunOpen`'s temporary branch).

## Off-Spine Concerns Around The Spine

| Concern | Spines | Serves | Responsibility | Why | Risk If On Main Line |
| --- | --- | --- | --- | --- | --- |
| `ArchivedAgentRunOpenError` | DS-003 | open coordinator / chat | Typed signal "stored run is archived" | Lets Chat distinguish archived from other open failures without widening the selection-outcome union used by other callers | — |

## Ownership Boundaries

Chat depends on `openWorkspaceExecutionLink` (unchanged boundary) and catches the coordinator's typed error. Context stores do not navigate. The coordinator does not navigate.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Mechanism | Callers | Forbidden Bypass | Fix If Too Thin |
| --- | --- | --- | --- | --- |
| `openAgentRun` | resume-config load, context commit | chat (via navigation service), history load actions, recovery | Chat reading resume config itself to decide | Typed error from the coordinator |
| `agentContextsStore.removeRun` / `agentTeamContextsStore.removeTeamContext` | selection consequence | mutation cleanups, `closeAgent` | Cleanups re-selecting runs themselves | — |

## Dependency Rules

- Stores and services must not import the router.
- `pages/chat.vue` may import `ArchivedAgentRunOpenError` from `services/runOpen/agentRunOpenCoordinator.ts`.
- No new dependency from stores to pages/components.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity Shape | Notes |
| --- | --- | --- | --- | --- |
| `openAgentRun(input)` (existing) | stored standalone agent run | project into context | `runId` | New: throws `ArchivedAgentRunOpenError` for archived & stopped |
| `class ArchivedAgentRunOpenError extends Error { runId }` (new, exported from the coordinator file) | archived agent run | signal | `runId` | — |

## Interface Boundary Check

| Interface | Singular? | Identity Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `openAgentRun` | Yes | Yes | Low | — |
| `ArchivedAgentRunOpenError` | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

| Node | Name | Natural? | Drift Risk | Action |
| --- | --- | --- | --- | --- |
| Error | `ArchivedAgentRunOpenError` | Yes | Low | — |
| Chat helper | `leaveToWorkspace` (local function) | Yes | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need | Existing | Decision | Why |
| --- | --- | --- | --- |
| Neutral state | `/workspace` empty state in `WorkspaceAdaptiveLayout.vue` | Reuse | Same as Org today (DEC-001) |
| Archived signal | `modelConfigEditability.reason = 'RUN_ARCHIVED'` | Reuse | Exactly equivalent to `archivedAt` on the catalog row; no API change |
| Route leave | Org's `leaveRemovedAgentOrgRoute` | Not reused | Lives in the panel and runs after the store action; Chat must react synchronously to its context vanishing to avoid a re-open/flash |

## Subsystem / Capability-Area Allocation

| Area | Concerns | Spines | Decision |
| --- | --- | --- | --- |
| Web chat page | route reaction | DS-001, DS-003 | Extend |
| Web context stores | selection on removal | DS-001, DS-002 | Modify |
| Web run open service | projection admission | DS-003 | Extend |

## Draft File Responsibility Mapping

See Final File Responsibility Mapping (no extraction needed).

## Reusable Owned Structures Check

N/A — no repeated structure.

## Shared Structure / Data Model Tightness Check

N/A — no shared type changed.

## Final File Responsibility Mapping

| File | Area | Owner | Concrete Concern | Shared? |
| --- | --- | --- | --- | --- |
| `autobyteus-web/pages/chat.vue` | chat page | route owner | Replace re-open watcher with leave-to-workspace; map `ArchivedAgentRunOpenError` in `ensureRunOpen` to leave-to-workspace | — |
| `autobyteus-web/stores/agentContextsStore.ts` | context store | selection on removal | `removeRun`: clear selection, no auto-select | — |
| `autobyteus-web/stores/agentTeamContextsStore.ts` | team context store | selection on removal | `removeTeamContext`: clear selection, no select-next | — |
| `autobyteus-web/services/runOpen/agentRunOpenCoordinator.ts` | run open | projection admission | Add `ArchivedAgentRunOpenError`; throw for archived & stopped before commit | — |
| Colocated specs: `pages/__tests__/chat.spec.ts`, `stores/__tests__/agentContextsStore.spec.ts`, `stores/__tests__/agentTeamContextsStore.spec.ts`, `services/runOpen/__tests__/` (coordinator spec), and a store-level archive/delete test in `stores/__tests__/runHistoryStore.spec.ts` or `runHistoryMutationActions` spec as fits | tests | — | AC coverage | — |

## Applied Patterns

None.

## Target Subsystem / Folder / File Mapping

All changes are modifications of the files above in their existing folders; no new files except tests if a coordinator spec does not exist yet.

## Folder Boundary Check

| Path | Depth | Clear? | Risk | Justification |
| --- | --- | --- | --- | --- |
| existing folders | unchanged | Yes | Low | No moves |

## Concrete Examples / Shape Guidance

| Topic | Good | Avoided | Why |
| --- | --- | --- | --- |
| Chat vanish watcher | `if (!context && previous && previous.state.runId === routeRunId.value && !isTemporaryRunId(routeRunId.value)) leaveToWorkspace()` | `void ensureRunOpen(routeRunId.value)` (re-open) | Re-open is the bug |
| Leave to workspace | `selectionStore.clearSelection(); void router.replace({ path: '/workspace' })` | `router.replace('/chat')` (New chat) or selecting another run | DEC-001 = workspace empty view |
| Safety net | coordinator: after `loadRunContextHydrationCandidate`, `if (resumeConfig.modelConfigEditability?.reason === 'RUN_ARCHIVED' && !resumeConfig.isActive) throw new ArchivedAgentRunOpenError(runId)` — before any `upsertProjectionContext` / selection | filtering archived contexts out of `runHistoryReadModel` local rows | A context must not exist at all; filtering would leave a hidden open run |
| Removal selection | `if (isSelected) selectionStore.clearSelection()` | `selectRun(remainingRunIds[0])` | REQ-002 |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Replacement |
| --- | --- | --- | --- |
| Keep auto-select for non-archive callers via a flag | Draft close also uses `removeRun` | Rejected | Draft close on `/chat` is route-driven (temp id → `/chat`); clearing selection is correct for all callers |
| Keep Chat re-open for "other" vanish causes | Generic robustness | Rejected | No other cause exists (investigation) |

## Derived Layering

N/A.

## Change / Refactor Sequence

1. Context stores: replace auto-select with clear; update their specs.
2. Coordinator: add `ArchivedAgentRunOpenError` and the archived & stopped check before commit; add/extend spec (archived & stopped → throws, no context, no selection; archived & active → opens as today; not archived → unchanged).
3. Chat: replace the vanish watcher; handle the typed error in `ensureRunOpen` (respect `openGeneration`); update `chat.spec.ts` (archived open-run removal → `/workspace`, selection cleared, no reopen call; temp removal → `/chat` unchanged; promotion → route follows unchanged; stale archived address → `/workspace`; deleted-run stale address still "chat not found").
4. Store/integration test: archive and delete of the open agent run and team run leave no loaded context, no `local` row and no other run selected (AC-001..003, AC-007, AC-009); Org regression (AC-004).
5. Live desktop validation (isolated instance per `TESTING.md`): AC-001..AC-006, AC-009 incl. team member view and reload/restart.

## Key Tradeoffs

- Reusing `RUN_ARCHIVED` instead of adding an `isArchived` field: zero API change; the reason is set exactly from `archivedAt` today. If the editability rules ever change, the coordinator spec will catch it.
- Chat-local leave vs. a central "leave removed run view" owner: the central option would run after the async store action and needs Chat's watcher removed anyway, producing a spinner flash; Chat-local is immediate and smaller.

## Risks

- Draft close while a different agent is loaded no longer silently selects that agent — no visible effect on `/chat` (route-driven); verify `agentRunStore`/panel specs.
- UNK-001: team open-run archive not yet observed live — covered by live validation.
- An archived run that was continued (became active) before this fix stays openable/recoverable (guarded by `!isActive`), so no live run is hidden.

## Guidance For Implementation

- Do not touch server code, GraphQL documents or `generated/graphql.ts`.
- Keep toasts, confirmations and the running-run guard unchanged.
- The vanish watcher must not fire for promotion (existing `previous.state.runId !== routeRunId` check) or temp ids.
- In `ensureRunOpen`, check `generation !== openGeneration` before leaving.
- Follow `TESTING.md`: colocated specs via `pnpm -C autobyteus-web test:nuxt <path> --run`, then the full web suite.
