# IMP-001 — The reproductions fail on the base

- Date: 2026-11-27. Worktree `<worktree>`, branch `codex/team-stream-recovery-541`.
- Method: `run-red-on-base.sh` (beside this file) swapped in the base's (`80420a8bf6`) versions of the changed production files
  (`agentTeamRunStore.ts`, `TeamStreamingService.ts`, `teamRunOpenCoordinator.ts`, `agentRunOpenCoordinator.ts`,
  `localUserSubmission.ts`, `runHistoryLoadActions.ts`, `agentRuntimeStatusState.ts`, `TeamWorkspaceView.vue`,
  `MobileRunTargetView.vue`, `MessagePrimaryActionButton.vue`, `AgentContext.ts` and the four localization files), kept the
  new modules (`teamStreamRecoveryStore.ts`, `teamStreamAutoRecovery.ts`), ran the ticket's new and changed specs, then put
  this ticket's versions back (`git diff --stat` checked after).
- Command: `env -i PATH HOME TMPDIR USER` + `NUXT_TEST=true npx vitest run <10 spec files>`.

## Result on the base

- `Test Files  10 failed (10)`
- `Tests  38 failed | 154 passed (192)`

Each reproduction fails on the base code:

- localUserSubmission > retargetLocalUserSubmissionContext > moves a shown message into the new conversation, where its outcome then lands
- localUserSubmission > retargetLocalUserSubmissionContext > adds nothing when the new conversation already has the node's echo of it
- localUserSubmission > retargetLocalUserSubmissionContext > moves a held send without a row; its acceptance shows it on the new member
- localUserSubmission > retargetLocalUserSubmissionContext > does nothing for the context it already names
- openTeamRun current exact execution identity > a reselect superseded during the replacement recovers the stream and selects nothing
- openTeamRun current exact execution identity > one recovery per Team (autobyteus-541 D-A3, AC-003) > a reselect during the automatic recovery joins it: one read, one replacement, then its selection
- openTeamRun current exact execution identity > one recovery per Team (autobyteus-541 D-A3, AC-003) > a reselect of another member joins the recovery, then loads and focuses that member
- MessagePrimaryActionButton labels > zh-CN send reads "发送消息"
- MessagePrimaryActionButton labels > zh-CN interrupt reads "停止生成"
- agentTeamRunStore current rooted execution contract > a failed stream with no recovery owner registered throws instead of waiting silently
- agentTeamRunStore current rooted execution contract > latches one persistent recovery state and blocks ordinary service reuse
- agentTeamRunStore current rooted execution contract > preserves failed entries and recovery state when the candidate handshake rejects
- agentTeamRunStore across a Team stream recovery (autobyteus-541 A) > typing across the commit: the draft and the page state go with the member; Stopping does not (D-A6)
- agentTeamRunStore across a Team stream recovery (autobyteus-541 A) > a send, then the commit, then success: the send waits, goes on the new stream, and lands on the new member (D-A4, D-A7)
- agentTeamRunStore across a Team stream recovery (autobyteus-541 A) > a send whose 10 s wait ends before a later commit: the draft and its notice come back and are carried (DEC-002)
- agentTeamRunStore across a Team stream recovery (autobyteus-541 A) > a send the failed stream had taken: its draft and unknown notice settle on the old member and are carried
- agentTeamRunStore across a Team stream recovery (autobyteus-541 A) > a held send (with a mention) moves without a row and shows on the new member when accepted (D-A7a)
- agentTeamRunStore across a Team stream recovery (autobyteus-541 A) > a send whose Team stream is closed while it waits gives the not-sent notice at once
- a Team stream recovers by itself after a real gap (autobyteus-541 AC-001, N-2) > an event past a gap: the view recovers in one attempt, the members show the node's status, and a send goes
- a Team stream recovers by itself after a real gap (autobyteus-541 AC-001, N-2) > a content batch whose range does not continue the view starts the same recovery
- a Team stream recovers by itself after a real gap (autobyteus-541 AC-001, N-2) > a candidate with an invalid snapshot fails that attempt; the next one recovers
- a Team stream recovers by itself after a real gap (autobyteus-541 AC-001, N-2) > a candidate whose socket closes before its snapshot fails that attempt; the next one recovers
- MobileRunScreen > shows the en Team recovery notice only once the recovery keeps failing
- MobileRunScreen > shows the zh-CN Team recovery notice only once the recovery keeps failing
- TeamWorkspaceView current aggregate > shows the en notice once the recovery keeps failing
- TeamWorkspaceView current aggregate > shows the zh-CN notice once the recovery keeps failing
- runHistoryStore > keeps a disconnected active run idle on refresh and reconnects its stream
- runHistoryStore > keeps a disconnected active run running on refresh and reconnects its stream
- runHistoryStore > keeps an Offline context whose run became active Offline until its stream, and connects it
- runHistoryStore > keeps a disconnected active Team's member statuses on refresh and reconnects its stream
- runHistoryStore > opens a run, hydrates projection, selects runContext, and connects stream when active
- runHistoryStore > trusts history active state and reconnects an agent stream when reopening an active run
- openAgentRun > reads once more after an Activity conflict and commits that read
- openAgentRun > commits the second read over a context a history refresh built during the first
- openAgentRun > keeps and shows the context the page holds when it changed again during the second read
- openAgentRun > keeps the held context when its Activity changed again during the second read
- openAgentRun > opens a run whose own status is idle (active true) as idle
- openAgentRun > opens a run whose own status is null (active true) as initializing

## Why each fails on the base

- **A (D-A1…D-A7a, AC-001, AC-010):**
  - the base store never publishes to a recovery owner, so the integration spec opens no replacement socket (`sockets[1]` undefined);
  - the base `ensureTeamStreamConnected` throws `TEAM_STREAM_REOPEN_REQUIRED` at once, so a send fails with an error row
    instead of waiting;
  - the base commit carries no page state (`requirement`, the notice and `submissionPending` are lost);
  - the base has no `retargetLocalUserSubmissionContext`.
- **D-A3 (AC-003):** the base runs a second read and a second replacement for a reselect during a recovery, and a
  superseded reselect aborts the commit.
- **D-A5:** the base shows an English literal for `required`, nothing for `exhausted`, and nothing on the phone.
- **D-B1 (AC-005):** the base opens an active idle run as `running` (the placeholder), and an unknown one as `running`.
- **D-B2 (AC-006):** the base throws "changed before projection commit" on a context or Activity change.
- **D-C1 (AC-004, N-3):** the base refresh turns an existing active run's or Team member's status to `initializing`.
- **D-D1 (AC-007):** the base labels are English literals in zh-CN.

## Passing on the base, as expected

- `a reselect whose joined recovery failed runs its own attempt`: the base always runs its own attempt.
- `a send whose echo is already in the new conversation is not shown twice`: a guard against a duplicate row. On the
  base the send fails before any retarget, so nothing is added either.
- `opens a run whose own status is running (active true) as running`: the base's placeholder happens to match.
