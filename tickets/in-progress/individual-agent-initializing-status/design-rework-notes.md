# Design Rework Notes

## Rework Trigger

- Architecture review round: 1
- Review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/individual-agent-initializing-status/tickets/in-progress/individual-agent-initializing-status/design-review-report.md`
- Blocking finding: AR-001 — active team-member history/snapshot reconciliation could overwrite a local `isSending && AgentStatus.Initializing` placeholder before backend team overlay/live status arrives.

## Rework Summary

The design package now explicitly covers the active team-member history/snapshot path in addition to the standalone active-history placeholder path.

Updated artifacts:

- Requirements: added REQ-008 and AC-006/AC-007 for active team-member snapshot preservation and live backend replacement.
- Investigation notes: added source findings for `teamRunContextHydrationService.ts`, `activeRunRecoveryCoordinator.ts`, and the AR-001 review report.
- Design spec: added DS-005 for active team history/member snapshot reconciliation and explicit ownership/file mapping.

## Ownership Decision

The guard belongs in the central frontend status owner with explicit opt-in from generic snapshot callers:

1. `autobyteus-web/services/runStatus/agentRuntimeStatusState.ts`
   - Add the shared in-flight predicate (`context.isSending && context.state.currentStatus === AgentStatus.Initializing`).
   - Add `preserveInFlightLocalStatus?: boolean` to `applyMemberOrHistoryStatusSnapshot()`.
   - Use the same predicate to guard `applyActiveRuntimePlaceholder()`.
2. `autobyteus-web/services/runHydration/teamRunContextHydrationService.ts`
   - Thread `preserveInFlightLocalStatus?: boolean` through `applyLiveTeamStatusSnapshot()` and internal member snapshot application.
3. `autobyteus-web/stores/runHistoryLoadActions.ts`
   - Pass `preserveInFlightLocalStatus: true` for existing active team contexts during history refresh/reconcile.
4. `autobyteus-web/services/runRecovery/activeRunRecoveryCoordinator.ts`
   - Pass the same preservation option for active team recovery.

Live websocket events remain authoritative and must continue to use `handleAgentStatus()` -> `applyLiveAgentStatusEvent()` without `preserveInFlightLocalStatus`.

## Regression Tests Added To Design Plan

- Existing non-subscribed active team context with a focused/member `isSending === true` and `AgentStatus.Initializing` placeholder remains `Initializing` when generic member snapshots are applied during refresh/recovery.
- A live backend websocket `AGENT_STATUS` event still replaces the local member placeholder.
- Existing standalone active placeholder and local-submission tests remain in scope.

## Review Request

This rework is ready for focused architecture re-review of AR-001.
