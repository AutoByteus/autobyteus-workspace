# Investigation Notes

- Ticket: `run-history-worktree-live-stream-loss`
- Date: `2026-03-10`
- Scope: `autobyteus-web` frontend run-history tree, team selection flow, and team event/activity surfaces.

## Files Investigated

- `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue`
- `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue`
- `autobyteus-web/composables/useWorkspaceHistorySelectionActions.ts`
- `autobyteus-web/composables/useWorkspaceHistoryTreeState.ts`
- `autobyteus-web/stores/runHistoryStore.ts`
- `autobyteus-web/stores/agentRunStore.ts`
- `autobyteus-web/stores/agentTeamRunStore.ts`
- `autobyteus-web/stores/runHistorySelectionActions.ts`
- `autobyteus-web/stores/agentTeamContextsStore.ts`
- `autobyteus-web/components/workspace/team/TeamWorkspaceView.vue`
- `autobyteus-web/components/workspace/team/AgentTeamEventMonitor.vue`
- `autobyteus-web/components/progress/ActivityFeed.vue`
- `autobyteus-web/stores/activeContextStore.ts`
- `autobyteus-web/components/layout/__tests__/WorkspaceDesktopLayout.spec.ts`
- `autobyteus-web/stores/__tests__/runHistoryStore.spec.ts`
- `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts`
- `autobyteus-web/components/workspace/team/__tests__/TeamWorkspaceView.spec.ts`
- `autobyteus-web/components/workspace/team/__tests__/AgentTeamEventMonitor.spec.ts`
- `autobyteus-web/components/progress/__tests__/ActivityFeed.spec.ts`
- `autobyteus-web/stores/__tests__/agentRunStore.spec.ts`
- `autobyteus-web/stores/__tests__/agentTeamRunStore.spec.ts`
- `autobyteus-web/stores/__tests__/agentContextsStore.spec.ts`
- `autobyteus-web/stores/__tests__/agentTeamContextsStore.spec.ts`

## Test-Backed Investigation Evidence

Executed in the ticket worktree after wiring local dependencies and running `nuxt prepare`:

- `pnpm -C autobyteus-web exec nuxt prepare` -> `Passed`
- `pnpm -C autobyteus-web test:nuxt components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts --run` -> `Passed` (`26` tests)
- `pnpm -C autobyteus-web test:nuxt stores/__tests__/runHistoryStore.spec.ts --run` -> `Passed` (`20` tests)
- `pnpm -C autobyteus-web test:nuxt stores/__tests__/agentRunStore.spec.ts stores/__tests__/agentTeamRunStore.spec.ts stores/__tests__/agentContextsStore.spec.ts stores/__tests__/agentTeamContextsStore.spec.ts --run` -> `Passed` (`30` tests)
- `pnpm -C autobyteus-web test:nuxt components/workspace/team/__tests__/TeamWorkspaceView.spec.ts components/workspace/team/__tests__/AgentTeamEventMonitor.spec.ts --run` -> `Passed` (`10` tests)
- `pnpm -C autobyteus-web test:nuxt components/progress/__tests__/ActivityFeed.spec.ts components/layout/__tests__/WorkspaceDesktopLayout.spec.ts --run` -> `Passed` (`7` tests)

What those passing tests prove:

- `WorkspaceAgentRunsTreePanel.spec.ts` currently expects a team top-row click to call only `selectionStore.selectRun('team-1', 'team')`.
- `WorkspaceAgentRunsTreePanel.spec.ts` currently expects delete affordances only for inactive persisted history rows, not for draft/temp rows.
- `runHistoryStore.spec.ts` currently expects `deleteRun('temp-123')` to return `false` and skip backend mutation.
- `runHistoryStore.ts` currently hard-rejects `deleteTeamRun('temp-*')`.
- `agentRunStore.ts` and `agentTeamRunStore.ts` both leave temp runs/teams in local state after terminate-style actions instead of removing them.
- `WorkspaceDesktopLayout.spec.ts` confirms `selectionStore.selectedType === 'team'` is sufficient to route the center pane into `TeamWorkspaceView`.
- `TeamWorkspaceView.spec.ts` confirms the center team workspace renders from `activeTeamContext`; without that context, the component falls back to its empty-state branch.
- `AgentTeamEventMonitor.spec.ts` confirms the team event monitor renders from `activeTeamContext` plus `focusedMemberContext`, not from the raw selected run ID alone.
- `ActivityFeed.spec.ts` confirms the right-side activity feed renders against `activeContextStore.activeAgentContext.state.runId`, and `activeContextStore.ts` resolves that team-side value from `focusedMemberContext`.

Conclusion:

- The existing suite does not catch the user-reported bugs because it encodes the behavior that causes them.
- The UI-surface suites also prove the downstream impact path: once team selection points at a run ID with no loaded team/member context, the center team pane and right activity feed no longer have a valid live context to render.
- This is now backed by executable test results plus direct source-path confirmation, not only by code reading.

## Cross-Surface Proof Chain

1. `WorkspaceAgentRunsTreePanel.spec.ts` proves the current team top-row click path calls only `selectionStore.selectRun(teamRunId, 'team')`.
2. `runHistoryStore.spec.ts` separately proves the correct persisted-team hydration path already exists at `selectTreeRun(...) -> openTeamMemberRun(...)`, but the top-row click path does not use it.
3. `WorkspaceDesktopLayout.spec.ts` proves `selectedType === 'team'` is enough for the center pane shell to switch into `TeamWorkspaceView`.
4. `TeamWorkspaceView.vue` and `TeamWorkspaceView.spec.ts` prove the actual team content is gated by `agentTeamContextsStore.activeTeamContext`.
5. `AgentTeamEventMonitor.vue` and `AgentTeamEventMonitor.spec.ts` prove the event monitor is gated by `focusedMemberContext` and falls back to empty messaging when that context is absent.
6. `activeContextStore.ts` proves the right-side feed for team selection is derived from `agentTeamContextsStore.focusedMemberContext`.
7. `ActivityFeed.spec.ts` proves the feed only follows `activeContextStore.activeAgentContext.state.runId`.

Net result:

- A history-team top-row click can put the layout into "team selected" mode while failing to load a usable team/member context.
- When that happens, the left tree selection, center team pane, and right activity feed are no longer driven by the same underlying context, which matches the user-reported disappearance and live-stream detachment symptoms.

## Current Behavior Trace

1. Team rows in the work tree call `useWorkspaceHistorySelectionActions.onSelectTeam`.
2. `onSelectTeam` currently does two things only:
   - toggles the row expansion state,
   - writes `selectionStore.selectRun(teamRunId, 'team')`.
3. For a historical team that is not already loaded into `agentTeamContextsStore`, that selection points the app at a team run ID with no local `AgentTeamContext`.
4. `TeamWorkspaceView` renders from `agentTeamContextsStore.activeTeamContext`, which becomes `null` when the selected team run ID has no local context.
5. `AgentTeamEventMonitor` and `ActivityFeed` also derive from the currently selected active/focused context, so global selection can move the UI away from the still-running team even though the live in-memory team context still exists.

## Root Cause Findings

### Finding 1: Historical team-row clicks can select a nonexistent team context

- Source:
  - `autobyteus-web/composables/useWorkspaceHistorySelectionActions.ts`
  - `autobyteus-web/stores/agentTeamContextsStore.ts`
  - `autobyteus-web/components/workspace/team/TeamWorkspaceView.vue`
- Detail:
  - Clicking a team row in the history tree does not hydrate/open that team through `runHistoryStore.selectTreeRun`.
  - It only updates the global selection store.
  - For historical teams, this produces `selectionStore.selectedType === 'team'` with no matching `activeTeamContext`.
- User-facing effect:
  - The center team workspace and live event monitor lose the previously selected live team context and can appear blank or detached from the still-running team.

### Finding 1A: Existing tests currently lock in that blind-selection behavior

- Test evidence:
  - `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts`
  - test name: `renders team rows under workspace and selects the team when clicked`
- Detail:
  - The current spec asserts `selectionStore.selectRun('team-1', 'team')` on top-row click.
  - There is no expectation that top-row selection routes through `runHistoryStore.selectTreeRun` or hydrates a usable team member context.
- Result:
  - The automated suite currently blesses the state split that causes the blank/vanishing-live-context symptom.

### Finding 2: Team expansion state is tied too strongly to current selection

- Source:
  - `autobyteus-web/composables/useWorkspaceHistoryTreeState.ts`
- Detail:
  - `isTeamExpanded(teamRunId)` auto-expands only the currently selected team unless the team was explicitly toggled into `expandedTeams`.
  - A previously selected live team can therefore lose its expanded member list as soon as selection moves elsewhere.
- User-facing effect:
  - The running team’s member rows can appear to “disappear” from the work tree when the user clicks another team, even though the run still exists in memory.

### Finding 3: Single-agent history reopen has a safer path than team history selection

- Source:
  - `autobyteus-web/services/runOpen/runOpenCoordinator.ts`
  - `autobyteus-web/services/runOpen/runOpenStrategyPolicy.ts`
  - `autobyteus-web/stores/runHistorySelectionActions.ts`
- Detail:
  - Single-agent history reopen goes through `openRunWithCoordinator`, which explicitly preserves an already subscribed live context.
  - Team top-row history selection has no equivalent hydration/opening path; it only mutates selection state.
- Consequence:
  - The team path is more fragile and can desynchronize the work tree selection from a usable loaded context.

### Finding 4: Empty draft agent runs have no removal path in the work tree

- Source:
  - `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue`
  - `autobyteus-web/composables/useWorkspaceHistoryMutations.ts`
  - `autobyteus-web/stores/runHistoryStore.ts`
  - `autobyteus-web/stores/agentRunStore.ts`
- Detail:
  - Draft agent rows are rendered with `source: 'draft'`.
  - The delete button is rendered only for `run.source === 'history' && !run.isActive`.
  - `runHistoryStore.deleteRun('temp-*')` explicitly returns `false`.
  - `agentRunStore.terminateRun('temp-*')` only marks the temp run inactive and does not remove its local context.
- User-facing effect:
  - A newly created agent draft with no first message cannot be cleanly removed from the work tree.

### Finding 5: Empty draft team runs can be stopped but still cannot be removed cleanly

- Source:
  - `autobyteus-web/stores/agentTeamRunStore.ts`
  - `autobyteus-web/stores/runHistoryStore.ts`
  - `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue`
- Detail:
  - Temp team runs (`temp-*`) show a terminate path because `canTerminateTeam(Idle)` returns `true`.
  - `agentTeamRunStore.terminateTeamRun('temp-*')` marks the local temp team shutdown but returns without removing the team context.
  - Once shutdown, the row can surface a delete action, but `runHistoryStore.deleteTeamRun('temp-*')` explicitly returns `false`.
- User-facing effect:
  - A newly created team draft with no first message can end up stuck in the tree: it is neither a real persisted history row nor a removable local draft.

## Scope / Triage Conclusion

- Confirmed classification: `Medium`
- Rationale:
  - The ticket now covers two related work-tree/frontend lifecycle bugs:
    - historical team navigation losing usable live context,
    - empty draft agent/team runs lacking a removal path.
  - The fix remains frontend-only, but it spans shared composables, store orchestration, and regression tests.

## Recommended Fix Direction

1. Make team-row selection route through a real team-open path using the team’s focused/default member instead of blindly selecting a team run ID with no loaded context.
2. Make team expansion state sticky once a team is selected/opened, so switching to another team does not implicitly collapse the previously active team’s member rows.
3. Add a local draft-removal path for:
   - draft agent runs (`temp-*`) before first message,
   - draft team runs (`temp-team-*`) before first message.
4. Add regression tests that cover:
   - historical team-row click hydrating/selecting through `runHistoryStore.selectTreeRun`,
   - previously opened live team rows remaining expanded while another team is selected,
   - empty draft agent/team removal behavior.
