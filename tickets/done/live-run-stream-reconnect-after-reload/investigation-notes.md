# Investigation Notes

- Ticket: `live-run-stream-reconnect-after-reload`
- Last Updated: `2026-03-10`
- Scope Triage: `Medium`

## Sources Consulted

- `/Users/normy/autobyteus_org/autobyteus-worktrees/live-run-stream-reconnect-after-reload/autobyteus-web/stores/runHistoryStore.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/live-run-stream-reconnect-after-reload/autobyteus-web/stores/runHistorySelectionActions.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/live-run-stream-reconnect-after-reload/autobyteus-web/services/runOpen/runOpenCoordinator.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/live-run-stream-reconnect-after-reload/autobyteus-web/services/runOpen/runOpenStrategyPolicy.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/live-run-stream-reconnect-after-reload/autobyteus-web/stores/agentRunStore.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/live-run-stream-reconnect-after-reload/autobyteus-web/stores/agentTeamRunStore.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/live-run-stream-reconnect-after-reload/autobyteus-web/stores/agentContextsStore.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/live-run-stream-reconnect-after-reload/autobyteus-web/stores/agentTeamContextsStore.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/live-run-stream-reconnect-after-reload/autobyteus-web/stores/activeContextStore.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/live-run-stream-reconnect-after-reload/autobyteus-web/components/workspace/team/TeamWorkspaceView.vue`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/live-run-stream-reconnect-after-reload/autobyteus-web/components/workspace/team/AgentTeamEventMonitor.vue`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/live-run-stream-reconnect-after-reload/autobyteus-web/components/progress/ActivityFeed.vue`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/live-run-stream-reconnect-after-reload/autobyteus-web/stores/agentActivityStore.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/live-run-stream-reconnect-after-reload/autobyteus-web/services/agentStreaming/TeamStreamingService.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/live-run-stream-reconnect-after-reload/autobyteus-web/services/agentStreaming/handlers/segmentHandler.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/live-run-stream-reconnect-after-reload/autobyteus-web/services/agentStreaming/handlers/toolLifecycleHandler.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/live-run-stream-reconnect-after-reload/autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/live-run-stream-reconnect-after-reload/autobyteus-web/stores/agentSelectionStore.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/live-run-stream-reconnect-after-reload/autobyteus-web/stores/__tests__/runHistoryStore.spec.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/live-run-stream-reconnect-after-reload/autobyteus-web/stores/__tests__/agentTeamRunStore.spec.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/live-run-stream-reconnect-after-reload/autobyteus-web/services/agentStreaming/__tests__/TeamStreamingService.spec.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/live-run-stream-reconnect-after-reload/autobyteus-web/components/progress/__tests__/ActivityFeed.spec.ts`

## Executed Investigation Checks

- `pnpm -C autobyteus-web test:nuxt stores/__tests__/runHistoryStore.spec.ts stores/__tests__/agentTeamRunStore.spec.ts services/agentStreaming/__tests__/TeamStreamingService.spec.ts components/progress/__tests__/ActivityFeed.spec.ts --run`
  - Result: `4` files passed, `30` tests passed.
  - Environment note: the dedicated worktree required non-source symlinks to the main repo `node_modules` and `autobyteus-web/.nuxt` so tests could run without a fresh dependency install/build.

## Key Findings

1. Current app startup is history-fetch driven, not live-run restore driven.
   - `WorkspaceAgentRunsTreePanel.vue` fetches workspaces and run history on mount and then quiet-refreshes every five seconds.
   - No startup path restores a previously selected run or automatically reopens a live run into the center pane.
   - `agentSelectionStore.ts` keeps selection only in memory; there is no persistence layer for `selectedRunId` / `selectedType`.

2. The right Activity panel and the middle event monitor do not read from the same state shape, even though they represent the same focused run.
   - `ActivityFeed.vue` reads `activeContextStore.activeAgentContext?.state.runId` and renders `agentActivityStore` sidecar entries keyed by run ID.
   - `AgentTeamEventMonitor.vue` renders the focused member conversation directly from `agentTeamContextsStore.focusedMemberContext.state.conversation`.
   - Because activity is sidecar state and conversation is inline run context state, the UI can split if stream events continue to update activities for a run ID while the center pane is bound to a stale or projection-only conversation object.

3. Single-agent reopen already has a live-context preservation policy; team reopen does not.
   - `runOpenCoordinator.ts` uses `decideRunOpenStrategy(...)` for active single-agent reopen.
   - When an active agent run already has a subscribed local context, single-agent reopen chooses `KEEP_LIVE_CONTEXT` and patches config only, avoiding replacement of the live conversation object.
   - Team reopen in `runHistorySelectionActions.ts:openTeamMemberRunFromHistory(...)` always builds a fresh team projection context and inserts it with `agentTeamContextsStore.addTeamContext(...)`.

4. Team stream reconnect ownership is send-driven and local-context-driven, not reopen-strategy-driven.
   - `agentTeamRunStore.sendMessageToFocusedMember(...)` explicitly reconnects if a persisted team is offline or the stream is disconnected.
   - `openTeamMemberRunFromHistory(...)` connects for active teams, but it does not reason about whether an existing live team context should be preserved versus replaced.
   - `agentTeamRunStore.connectToTeamStream(...)` reuses an existing `TeamStreamingService` if one exists and only reconnects when its connection state is `DISCONNECTED`.

5. The likely stale-context failure mode for teams is real in the current design.
   - `agentTeamContextsStore.addTeamContext(...)` is a bare `Map.set(...)`.
   - `TeamStreamingService.connect(...)` captures a `teamContext` reference internally and later mutates that object on incoming messages.
   - If a fresh projection context is inserted for an already-connected active team, the store can point the UI at a new context while the existing stream service still mutates the old detached context object.
   - That exact split would produce the observed symptom: right-side Activity remains live by run ID, while the middle event monitor stays static because it is rendering the replaced conversation object.

6. Existing regression coverage does not cover the new ticket’s failure contract.
   - `runHistoryStore.spec.ts` covers inactive team history open and single-agent active reopen policy, but not active team reopen with context-preservation expectations.
   - `agentTeamRunStore.spec.ts` covers reconnect on send after offline/disconnected state, but not reopen/reselect of an active team without a new send action.
   - `TeamStreamingService.spec.ts` covers basic connect/disconnect state only.

## Module / File Placement Observations

- `services/runOpen/*` already owns single-agent reopen strategy and projection hydration concerns. That is the canonical location for any shared reopen decision logic.
- `stores/runHistorySelectionActions.ts` currently owns team history open/hydration orchestration. If team reopen needs parity with single-agent reopen, this is the most likely integration point.
- `stores/agentTeamContextsStore.ts` owns selected live team context identity. If replacement versus merge/upsert behavior changes, ownership should stay here rather than leaking into components.
- `stores/agentTeamRunStore.ts` owns WebSocket connection lifecycle. Reconnect policy should stay here, but it likely needs a richer handoff from the reopen path.
- `components/workspace/team/*` and `components/progress/*` appear correctly placed as rendering surfaces only; the fix should stay out of component-local state.

## Open Unknowns

1. Should the product requirement for this ticket be:
   - reconnect when the user explicitly reopens/selects an active run after reload, or
   - automatically restore the previously focused live run on app reload, or
   - background-subscribe all active runs on app reload?
   - Update `2026-03-10`: user clarified that all active runs should continue streaming into frontend state after reload, while rendered surfaces may keep only bounded recent history.
2. Is the user’s reported force-reload symptom entirely explained by missing explicit reload recovery, or is the stale-team-context overwrite path also happening in current user journeys before/after reload?
3. Is single-agent reload continuity already acceptable in real user journeys, or should this ticket explicitly enforce parity for both single-agent and team reopen?

## Current Implications For Design

- User clarification resolved the main requirement fork: the frontend should restore live stream ingestion for all active runs after reload, not only the currently selected run.
- The architecture currently has no background active-run subscription manager, so this ticket likely needs new orchestration that:
  - scans active agent/team runs after history fetch,
  - establishes or re-establishes background subscriptions,
  - keeps bounded in-memory event/message history,
  - preserves view-surface alignment when the user focuses one of those already-live runs.
- Active team reopen still needs parity with single-agent live-context preservation, because replacing a subscribed team context remains a credible way to recreate the “activity live, middle monitor static” split even after background recovery is added.
