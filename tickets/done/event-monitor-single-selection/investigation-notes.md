# Investigation Notes

## Investigation Status

- Bootstrap Status: `Complete`
- Current Status: `Approved for architecture review`
- Investigation Goal: Trace why multiple left-navigation rows can appear selected while only one event monitor is visible, establish the authoritative selection state and lifecycle, and define a design-ready fix.
- Scope Classification: `Medium`
- Scope Classification Rationale: The root cause is local to the web history-tree row predicate, but the correction crosses a state contract, stable/transient row rendering, accessibility semantics, and regression coverage.
- Scope Summary: Event-monitor navigation selection and its visual/accessibility contract only; no event-monitor content or persisted data change.
- Primary Questions To Resolve:
  1. Where is the currently viewed event-monitor target stored and how is it passed to the center pane?
  2. Which component/class/style renders the left-row selected appearance, and why can it apply to multiple rows?
  3. What supported lifecycle paths initialize, change, restore, or clear the target?
  4. Which tests cover this behavior, and what new/updated executable coverage is needed?

## Request Context

The user reports that the application shows one event monitor in the main pane but multiple entries on the left can be highlighted, making the actual viewed event monitor unclear. The supplied screenshot shows repeated `code_reviewer` rows in separate grouped histories with selected-looking backgrounds while the center pane displays one `code_reviewer` event monitor. The requested outcome is an investigation and a clear implementation plan for singular active selection.

Reference screenshot: `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_e2a8b8e26626426e9384a913a3323bb0/solution_designer_ea81cb0e8eae4269bd15abc559f975a1/context_files/ctx_c01742bcaf99__image.png`

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): `Git`
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/event-monitor-single-selection`
- Current Branch: `codex/event-monitor-single-selection`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` succeeded on 2026-08-11
- Task Branch: `codex/event-monitor-single-selection`
- Expected Base Branch (if known): `personal` / `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None for code investigation. Frontend executable tests are not runnable in this fresh worktree because `autobyteus-web/node_modules` is absent; see runtime findings.
- Notes For Downstream Agents: This is a dedicated ticket worktree created from refreshed `origin/personal`; no implementation source changes have been made.

## Supplemental Task Artifact Inventory

| Artifact Path | Purpose And Scope | Evidence, Context, Or Decision Captured | Core Artifact(s) Supported | Related Requirement / Acceptance-Criteria IDs (When Applicable) | Status | Approval Applicability / State | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/event-monitor-single-selection/ui-ux-spec.md` | UI/UX state and interaction specification for singular event-monitor selection | Compound identity, state separation, lifecycle, keyboard, accessibility, and visual-state rules | Requirements doc; design spec | REQ-001..REQ-005 / AC-001..AC-005 | Approved for architecture review | Intended behavior; approved by user on 2026-08-11 | Keep aligned through architecture review and implementation feedback. |

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-08-11 | Setup | `git fetch origin --prune` | Refresh the tracked base before task isolation | Remote refs refreshed successfully. | No |
| 2026-08-11 | Setup | `git worktree add -b codex/event-monitor-single-selection /Users/normy/autobyteus_org/autobyteus-workspace-superrepo origin/personal` | Create isolated authoritative task workspace | Dedicated worktree and task branch created from `origin/personal`. | No |
| 2026-08-11 | Command | `git -C /Users/normy/autobyteus_org/autobyteus-workspace-superrepo status --short --branch` | Verify bootstrap state | Branch is clean and tracks `origin/personal` before artifact creation. | No |
| 2026-08-11 | Other | `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_e2a8b8e26626426e9384a913a3323bb0/solution_designer_ea81cb0e8eae4269bd15abc559f975a1/context_files/ctx_c01742bcaf99__image.png` | Observe reported UI symptom | One center event monitor and multiple left rows with selected-looking backgrounds; repeated member labels occur in separate groups. | Trace implementation |
| 2026-08-11 | Code | `autobyteus-web/stores/agentSelectionStore.ts` | Identify viewed-target owner | `selectedRunId` + `selectedType` are single-valued; `selectRun` overwrites prior selection and `clearSelection` clears it. | No |
| 2026-08-11 | Code | `autobyteus-web/components/layout/WorkspaceAdaptiveLayout.vue:18-20,178-183` | Connect selection to center surface | `selectedType` chooses either `AgentWorkspaceView` or `TeamWorkspaceView`; only one center view is rendered. | No |
| 2026-08-11 | Code | `autobyteus-web/components/workspace/team/AgentTeamEventMonitor.vue:2-19,74-103,126-130` | Trace team center target | Active team comes from selected team run; focused member route resolves within that team; one `AgentEventMonitor` receives that member conversation and compound browse subject. | No |
| 2026-08-11 | Code | `autobyteus-web/composables/useWorkspaceHistorySelectionActions.ts:64-113` and `autobyteus-web/stores/runHistorySelectionActions.ts:64-139` | Trace row activation to selection | History member activation selects the team run, focuses the member route, hydrates when needed, and clears incompatible standalone selection. | No |
| 2026-08-11 | Code | `autobyteus-web/stores/runHistoryNavigationProjection.ts:96-120` and `autobyteus-web/stores/runHistoryTeamHelpers.ts:127-159` | Verify team-local focus data | Projection builds team nodes keyed by `teamRunId` and overlays each node with that context's `focusedMemberRouteKey`; focus is not globally collapsed. | No |
| 2026-08-11 | Code | `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue:292-370` | Find selected styling assignments | Stable row class at line 300 and transient `focused` prop at line 365 compare only `memberRouteKey` with each team's focus; neither checks whether the team owns the authoritative selected run. | Design fix required |
| 2026-08-11 | Code | `autobyteus-web/components/workspace/history/workspaceHistorySectionContracts.ts` and `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue:148-320` | Identify state boundary | Section receives a state contract from the tree panel; the panel already owns `useAgentSelectionStore` and can expose a team-run selection predicate without a new store. | No |
| 2026-08-11 | Code | `autobyteus-web/composables/workspace/useWorkspaceRouteSelection.ts` and `autobyteus-web/services/workspace/workspaceNavigationService.ts:21-25,79-102` | Verify supported restoration/deep-link path | Workspace execution links identify agent run or team run plus member route; route selection opens through existing coordinators and strips the query afterward. No persisted reload-selection contract found. | No |
| 2026-08-11 | Code | `autobyteus-web/components/workspace/history/__tests__/WorkspaceHistoryWorkspaceSection.spec.ts`, `WorkspaceAgentRunsTreePanel.spec.ts`, `WorkspaceAgentRunsTreePanel.regressions.spec.ts` | Assess existing durable coverage | Tests cover row rendering, focus, nested/transient behavior, selection calls, and preserving expansion, but no test asserts identical member route keys across two team runs produce exactly one selected row. | Downstream coverage investigation |
| 2026-08-11 | Command | `pnpm -C autobyteus-web exec vitest --version` and focused Vitest invocation | Attempt implementation-scoped executable baseline | Failed before test execution: `vitest` is not installed in the fresh worktree (`ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL`). | Install/setup belongs to `api_e2e_engineer`; do not treat as product failure. |
| 2026-08-11 | Repo | `git show 5f148c5aa -- autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue` | Identify introduction of route-only comparison | Team-member tree rendering added focus-based selected classes during the “auto-open team tasks and nest history members” change; the predicate remained route-only as team runs became grouped. | No |
| 2026-08-11 | Command | `git blame -L 292,370 -- autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue` | Confirm current ownership and history | Current route-only stable/transient comparisons are in the history section; projection code separately tracks team identity. | No |

## Relevant Existing Behavior And Production Paths

| Behavior ID | Kind (`User`/`System`/`Operational`/`Contract`) | Current Supported Trigger Or Governing Contract | Current Production Path And Lifecycle | Meaningful Current Outcome / Invariants | Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | User | User activates a stable or transient team-member row in the workspace history tree. | `WorkspaceHistoryWorkspaceSection` row activation -> `useWorkspaceHistorySelectionActions.onSelectTeamMember` -> `runHistoryStore.selectTreeRun` -> `selectTreeRunFromHistory` -> `agentSelectionStore.selectRun(teamRunId, 'team')` plus team focus/hydration -> `agentTeamContextsStore.activeTeamContext` -> `AgentTeamEventMonitor` -> one `AgentEventMonitor`. | One center target is authoritative, but left stable/transient emphasis can appear on every team row sharing the same route key because the view predicate omits team ID. | `WorkspaceHistoryWorkspaceSection.vue:300,365`; `useWorkspaceHistorySelectionActions.ts`; `runHistorySelectionActions.ts`; `AgentTeamEventMonitor.vue:74-103`. |
| BEH-002 | User | User selects another team run/member or a standalone agent run. | Existing selection store overwrites its single selection; the history tree re-renders from selection/focus state; center layout switches by selected type. | Center selection is singular; incompatible team rows are not explicitly gated by selected type in the current child-row predicate. | `agentSelectionStore.ts:30-69`; `WorkspaceAdaptiveLayout.vue:18-20,178-183`; history section line 300. |
| BEH-003 | Contract/User | A supported workspace execution link supplies `agent` run ID or `team` run ID plus member route. | `useWorkspaceRouteSelection` watches query -> `openWorkspaceExecutionLink` -> existing agent/team open coordinator -> selection/focus commit -> history projection reveal and row render; route query is stripped. | Compound identity is available at the contract boundary; selected row rendering currently discards team identity when comparing focus. | `useWorkspaceRouteSelection.ts`; `workspaceNavigationService.ts:21-25,79-102`; `useWorkspaceHistoryTreeState.ts:54-108,325-358`. |

### Supported versus synthetic reachability

- `Reachable`: Multiple team runs with the same member route key can be present in the supported history tree because team runs are grouped by definition/workspace and each `TeamTreeNode` retains its own `teamRunId`; selecting one through the existing row or execution-link path produces one center target while route-only row styling matches more than one node.
- `Reachable`: Switching between agent and team selections is supported by `agentSelectionStore`; the current team-member class does not check `selectedType`, so route-matching team rows can look selected during an agent view as well.
- `Not Reachable / Out of scope`: Arbitrary hidden-state mutation, manually corrupted history, unsupported schema versions, or forced synthetic duplicate selections are not needed to explain or fix the reported symptom.

## Design Health Assessment Evidence

- Change posture: `Bug Fix` / `Behavior Change`
- Candidate root cause classification: `Missing Invariant`
- Refactor posture evidence summary: The authoritative owners and boundaries are healthy for this scope. The event-monitor owner already resolves one selected team and one focused member; the navigation projection already carries team identity. The defect is a local row predicate that conflates a team-local focus route with a globally unique viewed target. Add an explicit team-selection predicate at the existing tree-panel boundary; no new store, coordinator, or data model is justified.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `agentSelectionStore.ts` | `selectedRunId` and `selectedType` are single-valued and overwrite prior selection. | Existing selection owner satisfies singular center-view invariant. | Reuse it; do not create parallel UI selection state. |
| `AgentTeamEventMonitor.vue` | Active team and focused member are resolved from selected team context. | Center view already has compound team/member semantics. | Align row predicate with this identity. |
| `runHistoryNavigationProjection.ts` | Team nodes are indexed and patched by `teamRunId`; each node keeps own focus route. | Navigation data is not the source of multiple selection. | Preserve per-team projection. |
| `WorkspaceHistoryWorkspaceSection.vue:300,365` | Row emphasis checks only `memberRouteKey === focusedMemberRouteKey(team)`. | Missing team identity/type invariant directly explains screenshot. | Add tree-panel-owned `isTeamRunSelected` boundary and use it for stable/transient rows. |
| Existing history tests | No identical-route multi-team selected-row assertion. | Coverage gap is narrow and testable at component level. | Downstream coverage owner decides durable test edits. |
| Fresh worktree dependencies | Vitest cannot start because web dependencies are absent. | Test execution evidence is unavailable at design stage, not a product regression. | `api_e2e_engineer` owns setup/execution. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/stores/agentSelectionStore.ts` | Authoritative agent/team run selection and desktop center-view mode | Single `selectedType` + `selectedRunId`; selection overwrites prior selection. | Reuse as the only viewed-run authority. |
| `autobyteus-web/stores/activeContextStore.ts` | Facade for current agent or focused team member context | Resolves active context from selection store and team focus. | No change; center composer/runtime owner remains stable. |
| `autobyteus-web/components/layout/WorkspaceAdaptiveLayout.vue` | Chooses center view by selection type | Renders one agent/team view branch. | No change; proves one visible center surface. |
| `autobyteus-web/components/workspace/team/AgentTeamEventMonitor.vue` | Renders the active team's focused member event monitor | Resolves focus inside active team and passes one conversation to `AgentEventMonitor`. | No change; row selection must match its `(teamRunId, focusedMemberRouteKey)`. |
| `autobyteus-web/stores/runHistoryNavigationProjection.ts` | Projects workspace/team history navigation | Keeps per-team `focusedMemberRouteKey` and indexes team/member identity. | Preserve; it already exposes the necessary identity. |
| `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue` | Owns history tree setup and selection-store wiring | Has direct access to `selectionStore` and passes `WorkspaceHistorySectionState`. | Add a narrow `isTeamRunSelected(teamRunId)` adapter method. |
| `autobyteus-web/components/workspace/history/workspaceHistorySectionContracts.ts` | Contract between tree panel and workspace section | State contract currently exposes only agent `selectedRunId`, no team selection predicate. | Extend contract with explicit team-run selection query. |
| `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue` | Renders stable/transient team member rows and selected styling | Stable row and transient row use route-only focus comparison. | Combine team-run selection with team-local focus route; add current semantics. |
| `autobyteus-web/components/workspace/history/WorkspaceTransientExecutionRow.vue` | Renders transient execution row visual semantics and keyboard activation | `focused` controls extra emphasis, but base ghost background is intentionally always present. | Feed exact compound-selection result; preserve transient base semantics. |
| `autobyteus-web/composables/useWorkspaceHistorySelectionActions.ts` | Converts row activation to selection/open actions | Existing behavior already selects a team run and focused member. | No change to navigation action flow. |
| `autobyteus-web/stores/runHistorySelectionActions.ts` | Opens/hydrates historical agent/team targets | Existing behavior commits team selection and route focus. | No change; use as lifecycle authority. |
| `autobyteus-web/services/workspace/workspaceNavigationService.ts` | Parses/opens workspace execution links | Team link signature already contains team ID and member route. | No API or route contract change. |
| `autobyteus-web/components/workspace/history/__tests__/WorkspaceHistoryWorkspaceSection.spec.ts` | Component-level history row coverage | Covers focus/transient rendering but not cross-team duplicate route identity. | Add regression scenario for exactly one selected row. |
| `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts` | Tree-panel selection and rendering coverage | Covers selection calls and row behavior. | Add or update coverage only if needed by implementation contract. |
| `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.regressions.spec.ts` | Regression suite for history tree lifecycle | Covers expansion preservation and selection behavior. | Candidate for a cross-team selected-state regression. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-08-11 | Observation | Supplied screenshot inspection | Center pane has one team-member monitor while repeated member rows in separate groups have selected-looking backgrounds. | Confirms user-visible invariant breach. |
| 2026-08-11 | Trace | Source trace through `agentSelectionStore`, `WorkspaceAdaptiveLayout`, `AgentTeamEventMonitor`, history selection actions, and history row template | Center path is single-valued by selected team run; row emphasis is route-only. | Root cause is a missing `(teamRunId, memberRouteKey)` selection check. |
| 2026-08-11 | Static probe | Constructed witness from code contracts: Team A and Team B each have focused route `code_reviewer`; selection is `team:B`; row condition at line 300 is true for both. | Both rows satisfy the current template predicate even though `activeTeamContext` can only be Team B. | A focused component regression should encode this exact witness. |
| 2026-08-11 | Test setup attempt | `pnpm -C autobyteus-web exec vitest --version`; `cd autobyteus-web && pnpm exec vitest run ...` | Vitest was unavailable because the fresh worktree has no `autobyteus-web/node_modules`. | No executable pass/fail claim; environment setup is downstream work. |

## External / Public Source Findings

- Public API / spec / issue / upstream source: None consulted; the behavior is repository-local UI.
- Version / tag / commit / freshness: Repository base `origin/personal` refreshed on 2026-08-11.
- Relevant contract, behavior, or constraint learned: N/A.
- Why it matters: No external compatibility or API contract constrains the fix.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: Frontend Vitest dependencies for component tests; no backend service is needed for the focused regression.
- Required config, feature flags, env vars, or accounts: Existing Nuxt test configuration; no new flag or account identified.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: `git fetch origin --prune`; dedicated worktree creation; no package installation performed.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

- The event-monitor center path is explicitly single-valued: `WorkspaceAdaptiveLayout` branches on `selectionStore.selectedType`; `AgentTeamEventMonitor` reads `activeTeamContext` from the selected team run and passes one focused conversation to `AgentEventMonitor`.
- Team history navigation is compound-identity aware in its data model: `TeamTreeNode.teamRunId`, `focusedMemberRouteKey`, and `runHistoryMemberIndexKey(teamRunId, memberRouteKey)` are separate fields.
- The left history child-row visual predicate is not compound-identity aware. Stable rows use `displayRow.row.memberRouteKey === focusedTeamMemberRouteKey(team)`; transient rows receive the same route-only result as `focused`. Because each team node can independently have `focusedMemberRouteKey = 'code_reviewer'`, more than one row is styled as current-looking.
- `WorkspaceHistoryWorkspaceSection` does not currently expose `aria-current` or `aria-selected` for team-member navigation. The target design should add one appropriate current semantic only if no shared primitive already does so; `aria-selected` is not appropriate without a listbox/tree selection role redesign.
- A team row click selects the team and chooses/focuses a member; a member-row click selects the team run and member route. Existing actions should remain unchanged.
- `runHistoryStore.selectedTeamRunId` is a history-open bookkeeping field, but `agentSelectionStore.selectedType/selectedRunId` is the center-view authority and is the correct source for left-row current-state gating.

## Persisted Data Transition Evidence (When Applicable)

- Current stored subject, location, representative shape, and approximate volume: No persisted subject affected. Run history data remains in `runHistoryStore`; UI selection is Pinia state. Workspace execution-link query values are transient and stripped after opening.
- Relevant code-model, serialization, semantic, or physical-store change: None.
- Normal readers and writers, including unknown/extra-field behavior: N/A.
- Representative direct-read or compatibility evidence: N/A.
- Required semantics and invariants preserved by direct use: `Yes` — the change only changes which rendered rows receive selected/current styling; event/run history meaning and center content are untouched.
- Physical storage, privacy/security, disposal, rebuild, or operational constraints: No storage or migration operation.
- Concrete benefit, cost, and risk of migration if it remains a candidate: Migration has no benefit and is not a candidate.
- Existing migration framework or lifecycle constraints, only if migration may be required: N/A.

## Constraints / Dependencies / Compatibility Facts

- Must preserve the single center-pane event monitor and existing grouped navigation behavior.
- Must not retain a compatibility or dual-selection path for the replaced visual behavior.
- Must use stable `teamRunId` plus `memberRouteKey`; display names are not identities.
- Must distinguish selected/current from focus, hover, expansion, status, activity, and transient ghost states.
- Must preserve existing row actions, opening/hydration, keyboard activation, and route-link contracts.
- No server, GraphQL, WebSocket, persistence, or migration changes are expected.

## Open Unknowns / Risks

- Focused component tests cannot run in this fresh worktree until frontend dependencies are installed; downstream execution must record setup and results.
- The transient ghost background is intentionally always present and could still be perceived as emphasis; preserve it initially and validate selected/current ring/text behavior proportionately.
- A shared current semantic may be added by a future row primitive; implementation must check before adding duplicate `aria-current` attributes.

## Notes For Architecture Reviewer

Root cause is verified as a missing identity invariant in the history row presentation, not a multi-valued event-monitor selection. The target design should reuse `agentSelectionStore`, add a narrow `isTeamRunSelected(teamRunId)` adapter to `WorkspaceHistorySectionState`, gate stable and transient member emphasis by that predicate plus the team-local focused route, and add a focused regression for duplicate member route keys across team runs. No persisted-data transition, API change, or event-monitor refactor is justified.
