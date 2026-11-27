# Design Spec

## Basis

- SR-002 (A revised after ARCH-REV-001 AR-001, AR-002, N-1…N-3). SR-001. Requirements approved by the Solution Designer within the direction (requirements-doc.md, DEC-001…005).
- Authorities read: architecture-design, design-principles (7, 11, 13, 16, 17), `DESIGN.md` (rules 11, 12), design cases 1 and 21.
- **Data contract:** no stored or exchanged shape changes. The Team, run, Org and run-status stream contracts are unchanged; a page-side state is added in A.

## Task Size And Architectural Risk

- Size: `Large`. Five items across `autobyteus-web` (Team stream recovery, run open, status placeholder, Org refactor, localization) and `autobyteus-server-ts` (one handler); about 20 files.
- Risk: `High`.
  - A changes the Team stream's lifecycle: an automatic recovery that runs concurrently with the user's selection, sends and Stops, and replaces a live service and context.
  - B changes a concurrent commit rule.
- Escalation triggers:
  - an in-flight send cannot be retargeted without changing the Team stream's admission contract;
  - a send waiting across the replacement cannot reach the new service without a new contract.

## Design

### A: the Team stream recovers by itself (REQ-001, REQ-002; revised in SR-002 after ARCH-REV-001)

**Direction (AR-002).** The store publishes. The recovery owner listens and drives the coordinator. The coordinator commits through the store. The store never starts or knows the recovery.

| D | Owner | Change |
| --- | --- | --- |
| D-A1 | `agentTeamRunStore` | Publishes each Team's recovery state, a fired trigger: `required` (set in `onStreamRecoveryRequired`), then `recovering` and `exhausted` (set by the owner), cleared on commit or `disconnectTeamStream`. `TeamStreamingService`'s `onStreamRecoveryRequired` becomes a required option (no silent `() => undefined` default). A recovery owner registers itself with the store at start (`registerTeamStreamRecoveryOwner()`). Publishing `required` with no owner registered throws, so a missing wiring fails every spec and the page loudly |
| D-A2 | New `services/runOpen/teamStreamAutoRecovery.ts`, created and registered by a client plugin (`plugins/teamStreamRecovery.client.ts`, the composition root; desktop and phone load the same app) | Watches the store's recovery states. For each Team in `required`, one recovery with its own `LiveStreamReconnectScheduler` (the cadence every stream uses). An attempt calls `reopenTeamRunAfterStreamLoss({ teamRunId, selectRun: false })`. Success ends it. A failure calls `connectionLost()`. `onPersistentFailure` (the fifth) sets `exhausted`, and attempts go on.<br>**It ends without counting a failure (N-1) when:**<br>- the Team's context is removed;<br>- the Team's current service is no longer `reopen_required` (for example a reselect recovered it);<br>- the Team is no longer active (stopped).<br>An attempt checks these before it runs |
| D-A3 | `teamRunOpenCoordinator.reopenTeamRunAfterStreamLoss` | Single-flight per Team: a call while one runs awaits it. A user's reselect then selects the recovered context when it succeeded (intent rules as today), or runs its own attempt when it failed |
| D-A4 | `agentTeamRunStore.ensureTeamStreamConnected` | No `TEAM_STREAM_REOPEN_REQUIRED` throw. During recovery it waits, as for a connecting stream, for the Team's **current** service (`teamStreamingServices.get`, the replacement after commit) to be ready, within the same 10 s. Then `MessageNotDeliveredError('not_sent')` (540) |
| D-A5 | Desktop `TeamWorkspaceView.vue`, phone `components/mobile/runScreen/MobileRunTargetView.vue` | `WorkspaceRecoveryNotice` only for `exhausted`, key `workspace.team.recovery.exhausted` (en, zh-CN); the English literal goes |
| D-A6 | `agentTeamRunStore.replaceFailedTeamStream`, the one commit point for the automatic recovery and the user's reselect | **The page's own state carries over (AR-001).** In the same synchronous commit, for every member in both the old and the replacement view (by agent run ID), the old member context's page-local fields move to the new one: `requirement`, `contextFilePaths`, `requestedSkillNames`, `requestedMentions`, `messageNotDelivered`, `collaboratorAddFailure` and `submissionPending`. A member no longer in the tree loses them with its context. `interruptPending` is not carried: before any commit, the failed service settled its Stops (`enterReopenRequired` → `settleInterruptsNow`, `connection_lost`), which ends Stopping on the old context, and a Stop it had accepted ends with the old context's status, which no one shows any more. The new context starts without Stopping, and the replacement's snapshot status decides the button (533 D-W7, unchanged). One helper owns the field list (`carryAgentContextPageState(from, to)`, beside `AgentContext`), so a field added later is added in one place |
| D-A7 | `agentTeamRunStore.sendMessageToFocusedMember` | **An in-flight send follows the member (AR-001).**<br>- When `ensureTeamStreamConnected` returns, and again before any failure is shown, the send resolves the member's **current** context: `getTeamContextById(root)?.view.getAgentContext(target)`.<br>- If that is not `localSubmission.context`, a new `retargetLocalUserSubmissionContext(handle, current)` (in `localUserSubmission.ts`) moves the handle. Its optimistic message goes into the current conversation unless a message with its `messageId` is already there (the server's echo). Its outcome (accept, returned draft with the notice, error) then lands on the context the user sees.<br>- A send cannot reach the node before the commit: the failed service drained its admissions (`teamSends.drain` → `unknown`), and those settled on the old context before the commit, which then carried their notice and returned draft (D-A6) |
| D-A8 | `tests/e2e/fixtures/stop-generation-wire.mjs` | `schedule()` keeps one FIFO queue per link and direction. Each frame is due at `max(arrival + latency, previous due)`, and one timer drains the queue in order. Never a per-frame `setTimeout` computed from a second clock read |

**Walks (AR-001).**

| Case | Before the commit | At the commit | After |
| --- | --- | --- | --- |
| Typing | The user types into the old member context (the composer shows the active context) | D-A6 moves `requirement`, attachments, skills and mentions; the active context becomes the new one with the same text | Typing goes on in the new context. The commit is synchronous, so no keystroke falls between |
| Send, then commit, then success | The send waits in `ensureTeamStreamConnected` (D-A4); the old context has `submissionPending` and the optimistic row | D-A6 carries `submissionPending`; the composer stays "sending" | The wait returns the new service. D-A7 retargets the handle into the new context (its row is added unless the echo is there). The send goes on the new stream. The echo `MEMBER_INPUT_MESSAGE` resolves the admission, and the outcome lands on the new context |
| Send, then timeout at 10 s, then a later commit (for example at 15 s) | The send's 10 s wait ends. D-A7 resolves the current context, still the old one. The draft comes back, `messageNotDelivered` is set, `submissionPending` false | D-A6 carries the returned draft and the notice | The new context shows the text and the notice. Send is enabled (DEC-002) |
| A send that the old stream had taken | The service failure drained it (`unknown`): its draft and notice are on the old context | Carried | The snapshot shows whether the node had it (540's `unknown` rule) |
| Reselect during recovery | The user's reselect joins the in-flight recovery (D-A3) | The same commit (D-A6) | The selection is applied by the reselect's intent |
| Stop pressed while recovering | The failed service answers `not_sent` ("Stop was not sent: not connected…", 533); Stopping ends | Nothing to carry | The new context's status decides |

- Unchanged:
  - the gap check;
  - `enterReopenRequired`;
  - the verified replacement (`replaceFailedTeamStream` with the hydrated candidate and its expected base);
  - Stop settlement.

### B: opening a run (REQ-004, REQ-005)

| D | Owner | Change |
| --- | --- | --- |
| D-B1 | `agentRunOpenCoordinator.ts` | The status at open: for an active run, `normalizeAgentRuntimeStatus(useRunStatusStore().statusOf(runId))` when known, else `Initializing`; for a stopped run, `Offline` (as today). The stream's first `AGENT_STATUS` follows as today |
| D-B2 | `agentRunOpenCoordinator.ts` | When the context changed between `expectedContext` and the commit: read the candidate once more with the new expected context. If it changed again, do not replace it: patch nothing, select the current context (when `selectRun`), connect as today, and return committed. The `Agent activity … changed` conflict follows the same rule. "changed before projection commit" is no longer thrown |

### C: no Initializing placeholder for existing contexts (REQ-003)

| D | Owner | Change |
| --- | --- | --- |
| D-C1 | `runHistoryLoadActions.ts` | For an existing context (standalone `:330`, Team `:370-388`): keep `isLocked` and the reconnect. Drop `applyActiveRuntimePlaceholder`; the stream's snapshot sets the status |
| D-C2 | `agentRuntimeStatusState.ts` | `applyActiveRuntimePlaceholder` loses its last callers and is removed |
| D-C3 | `services/runRecovery/activeRunRecoveryCoordinator.ts` and its spec | Removed: no production caller (Principle 7) |

### D and E (REQ-006, REQ-007)

| D | Owner | Change |
| --- | --- | --- |
| D-D1 | `MessagePrimaryActionButton.vue` | Labels from localization keys (en, zh-CN). The `title` override stays |
| D-D2 | `team-tool-approval-command-handler.ts` | `activeRun` non-null and required; `teamRunId` only for log text, or dropped from logs; the null branch removed; the caller and spec adjusted |
| D-D3 | `CollaborationMessagesOrgRoot.integration.spec.ts:177` | An explicit 20 s timeout on that test |
| D-E1 | `agentOrgContextsStore.ts`, `agentOrgStreamingService.ts` | Each split by an owned concern into a sibling module, under 500 lines, no behavior change. Candidates: the store's recovery and readiness helpers; the service's frame processing (`processFrame` and its command answers). The implementation chooses the seam that one concern owns, and records it |
| D-E2 | `agentOrgConnectionLostError.ts` | Renamed `agentOrgCommandFailures.ts`; its 4 importers updated |

## Change Scope

- In scope:
  - the files above, and the web and server specs that cover them;
  - the stop-generation wire;
  - the two probes' cases for A and C;
  - localization.
- Left alone:
  - the server's stream order;
  - the Org stream's recovery;
  - the run-status feed;
  - the send and Stop answers;
  - stores outside these paths.
- Follow-ups: none yet.

## Removal

- `applyActiveRuntimePlaceholder`.
- `activeRunRecoveryCoordinator` and its spec.
- The `TEAM_STREAM_REOPEN_REQUIRED` throw on send.
- The English recovery literal.
- The null-run branch.
- The old file name.
- The wire's per-frame timers.
- `onStreamRecoveryRequired`'s silent default.
- The temporary investigation edits in the wire: `KEEP`, `through` and `from-node`. These are the Solution Designer's and are reverted before handoff.

## Guidance

- N-2: give every `enterReopenRequired` path a spec that the automatic recovery starts: a gap, an invalid snapshot, and a failed candidate.
- N-3: give the Offline-then-active context a spec: after DEC-002 it stays Offline until its stream, and a send marks activation pending.
- The AR-001 walks become specs: typing across a commit; send then commit then success; send then timeout then a later commit; reselect during recovery.

- **AC-001:** create the real gap deterministically, for example a probe wire option that withholds one Team frame, or a node test double. Test on desktop and phone.
- **AC-004:** run the 540 probe's SDD-12 and SDD-09 on the old code (expect the failure) and on the new code.
- **Reproductions:** keep the reproduction of each item failing on the old code (Task "Done when").
