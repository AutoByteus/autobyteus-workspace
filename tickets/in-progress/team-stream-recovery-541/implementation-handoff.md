# Implementation Handoff — team-stream-recovery-541 (autobyteus-541)

## Upstream Package

Paths are relative to the ticket folder `<worktree>/tickets/in-progress/team-stream-recovery-541`.

- Requirements: `requirements-doc.md`, Approved, SR-002 (REQ-001…008, AC-001…010, DEC-001…005).
- Investigation: `investigation-notes.md` and `evidence/investigation/`.
- Design: `design-spec.md`, SR-002 with its amendment after ARCH-REV-002 (N-4, N-5).
- Solution history: `solution-revision-record.md`.
- Architecture review: `design-review-report.md` (ARCH-REV-002, Pass) and `architecture-review-revision-record.md`. These
  two files are the reviewer's and stay untracked here; I left them alone.
- Worktree `<worktree>`, branch `codex/team-stream-recovery-541`, base `origin/personal` @ `80420a8bf6`.

## Summary

**Implementation Complete.** Ready for code review (Large / High). Not runtime acceptance, not delivery.

- Source and test commits on `codex/team-stream-recovery-541`:
  - `6dd0950606` A;
  - `29fc65eaaf` B and C;
  - `5a2ddf0fa2` D and E (web and server);
  - `12105e8360`, `e0a99d6b6d` and `a9ac2b40df`, the probes.

  This handoff, the revision record and the evidence are in the docs commit after them.
- Revision: IR-001 in `implementation-revision-record.md` (initial implementation).

## Routing

- `task_size`: Large; `architectural_risk`: High, unchanged from the design.
- Next: `/code_reviewer`.
- No Design Impact. Neither escalation trigger fired:
  - a send in flight is retargeted without changing the Team stream's admission contract;
  - a send waiting across the replacement reaches the new service through `teamStreamingServices.get`, with no new contract.

## What Was Built (by design item)

| D | Files | What it does |
| --- | --- | --- |
| D-A1 | `stores/teamStreamRecoveryStore.ts` (new), `stores/agentTeamRunStore.ts`, `services/agentStreaming/TeamStreamingService.ts` | Every Team stream the store creates publishes its failure (`publishRequired`). The state goes `required`, then `recovering` and `exhausted` (set by the owner), and is cleared at the commit and at `disconnectTeamStream`. A recovery under way keeps its state when its candidate fails. With no owner registered, publishing throws. `onStreamRecoveryRequired` is a required option, with no default. **Seam:** the recovery state lives in its own small store, not inside `agentTeamRunStore`; see "Deviations" |
| D-A2 | `services/runOpen/teamStreamAutoRecovery.ts` (new), `plugins/teamStreamRecovery.client.ts` (new) | The plugin starts the owner for the window's life; it registers before any stream opens. For each Team in `required`, the owner runs one `LiveStreamReconnectScheduler`: an attempt at once, then 1, 2, 4, 8, 16 and 30 s, none while the page is hidden. Each attempt calls `reopenTeamRunAfterStreamLoss({ teamRunId, selectRun: false })`. The fifth failure sets `exhausted`, and attempts go on. The recovery ends without counting a failure when the context is gone or the current stream is no longer `reopen_required` (checked before each attempt and after a failure), or when the store clears the state. A stopped Team is recovered too (N-4) |
| D-A3 | `services/runOpen/teamRunOpenCoordinator.ts` | One recovery per Team (`recoveriesByTeamRunId`). A call while one runs joins it. If that one succeeded, the reselect's own member is loaded (`ensureAuthoritativeTeamMemberProjection`), focused and selected. If it failed, the reselect runs its own attempt. The shared attempt carries no selection intent, so a superseded reselect no longer aborts the replacement: the stream recovers and nothing is selected |
| D-A4 | `agentTeamRunStore.ensureTeamStreamConnected` | No `TEAM_STREAM_REOPEN_REQUIRED` throw. It polls the Team's **current** service (`teamStreamingServices.get`) for 10 s, then throws `MessageNotDeliveredError('not_sent')`. A Team stream closed during the wait gives `not_sent` at once |
| D-A5 | `components/workspace/team/TeamWorkspaceView.vue`, `components/mobile/runScreen/MobileRunTargetView.vue`, en and zh-CN `workspace.ts` | `WorkspaceRecoveryNotice` shows only for `exhausted`, with the key `workspace.team.recovery.exhausted`. The English literal and the unused `…TeamWorkspaceView.stream_recovery_required` key are removed |
| D-A6 | `types/agent/AgentContext.ts` (`carryAgentContextPageState`), `agentTeamRunStore.replaceFailedTeamStream` | In the one synchronous commit, before `replaceTeamContext`, each member found in both views gets `requirement`, `contextFilePaths`, `requestedSkillNames`, `requestedMentions`, `messageNotDelivered`, `collaboratorAddFailure` and `submissionPending`. `interruptPending` is not carried |
| D-A7, D-A7a | `services/runSubmission/localUserSubmission.ts` (`retargetLocalUserSubmissionContext`), `agentTeamRunStore.sendMessageToFocusedMember` (`followCurrentMember`) | The send re-resolves the member's current context at three points: after the wait, after the send resolves, and before any failure is shown. A shown message moves into the new conversation unless its echo (the same `messageId`) is already there. A held send (with mentions) moves without a row, and `acceptLocalSubmission` shows it on the new context |
| D-A8 | `tests/e2e/fixtures/stop-generation-wire.mjs` | One FIFO queue per link and direction, drained by one timer, no per-frame timers. Also the AC-001 option `withholdBeforeTeamIdle` |
| D-B1 | `services/runOpen/agentRunOpenCoordinator.ts` | An active run opens with `normalizeAgentRuntimeStatus(useRunStatusStore().statusOf(runId), Initializing)`; a stopped one `Offline` |
| D-B2 | same | `readAndCommitRun` is called at most twice. When the context or its Activity revision changed, the open reads once more against the context now held. If that changed again, it keeps the held context (nothing patched), selects it and connects. "changed before projection commit" is no longer thrown |
| D-C1…C3 | `stores/runHistoryLoadActions.ts`, `services/runStatus/agentRuntimeStatusState.ts`, `services/runRecovery/activeRunRecoveryCoordinator.ts` (removed, with its spec) | An existing active context keeps `isLocked` and its reconnect; its status is the stream's. `applyActiveRuntimePlaceholder` and the dead coordinator are removed. `runHistoryLoadActions.ts` went from 507 to 493 lines |
| D-D1 | `components/agentInput/MessagePrimaryActionButton.vue`, en and zh-CN `agentInput.generated.ts` | "Send message" and "Stop generation" come from localization keys; the `title` override stays |
| D-D2 | `autobyteus-server-ts/.../team-tool-approval-command-handler.ts`, `agent-team-stream-handler.ts` | `activeRun` is required and non-null; the null branch, `teamRunId` and the handler's unused `teamRunId` local are gone. The logs name the agent run or the invocation. New unit test `team-tool-approval-command-handler.test.ts` |
| D-D3 | `CollaborationMessagesOrgRoot.integration.spec.ts` | An explicit 20 s timeout on the 42,000-reference test |
| D-E1 | `services/agentOrgExecution/agentOrgPendingCommands.ts` (new), `services/runConfigEditing/agentOrgConfigWorkspaces.ts` (new) | **Seams:** the streaming service's commands waiting for their answers (send-and-wait, acknowledgement, rejection) move to `AgentOrgPendingCommands`, so the service goes from 506 to 446 lines. The store's pure "workspaces a new Org configuration names" moves to `prepareAgentOrgConfigWorkspaces`, so the store goes from 506 to 482 lines. No behavior change; the Org specs pass unchanged |
| D-E2 | `services/agentOrgExecution/agentOrgCommandFailures.ts` (renamed) | Its 4 importers are updated; nothing imports the old name |

## Deviations From The Design (no Design Impact)

1. **D-A1's state is in `teamStreamRecoveryStore`, not in `agentTeamRunStore`.** Putting the state, the owner registration and the progress setter in `agentTeamRunStore` took it to 511 lines, over the 500-line rule. The direction is the design's:
   - `agentTeamRunStore` creates every Team stream with `onStreamRecoveryRequired → publishRequired`, and clears the state at its commit and close;
   - the owner watches the recovery store and drives the coordinator;
   - the coordinator commits through `agentTeamRunStore`;
   - neither store starts or knows a recovery.

   `agentTeamRunStore.ts` ends at 485 lines.
2. **D-A3's superseded reselect.** On the base, a reselect superseded mid-replacement threw in `beforeContextCommit` and left the stream failed. With one shared attempt, the replacement no longer depends on any one caller's selection. It commits, and the superseded caller selects nothing. The existing spec was rewritten to say so.

## Required Specs (design Guidance)

| Guidance | Spec |
| --- | --- |
| N-2: each way into `reopen_required` starts the automatic recovery | `services/runOpen/__tests__/teamStreamAutoRecovery.integration.spec.ts`. It uses the real `TeamStreamingService`, store, owner and coordinator over a fake socket, and covers an event past a gap, a content batch whose range does not continue, a candidate with an invalid snapshot, and a candidate whose socket closes. `enterReopenRequired` is reached only through the gap effect (`teamExecutionViewState.rejectGap`); a candidate's failure (`failCandidate`) is a failed attempt, which the owner retries. |
| N-3: Offline-then-active | `runHistoryStore.spec` "keeps an Offline context whose run became active Offline until its stream". The send half is the existing `agentRunStore.spec` "marks a resume of a offline run before connecting". |
| AR-001 walks (AC-010) | `stores/__tests__/agentTeamRunStore.streamRecovery.spec.ts`: typing across the commit; a send, then the commit, then success; a send whose 10 s wait ends before a later commit; a send the old stream had taken (`unknown`); a held send; an echo already present; a stream closed during the wait. Reselect during recovery: `teamRunOpenCoordinator.spec` "one recovery per Team". |
| AC-003 | `teamRunOpenCoordinator.spec` "one recovery per Team" (4 tests) |
| D-A2 cadence and end conditions | `services/runOpen/__tests__/teamStreamAutoRecovery.spec.ts` (10 tests) |
| AC-005, AC-006 | `agentRunOpenCoordinator.spec` (D-B1 table; D-B2 four races) |
| AC-007 | `components/agentInput/__tests__/MessagePrimaryActionButton.spec.ts` |
| D-A5 | `TeamWorkspaceView.spec`, `MobileRunScreen.spec` (en and zh-CN, only `exhausted`) |
| D-A7 | `localUserSubmission.spec` "retargetLocalUserSubmissionContext" |

**Red on the base:** `evidence/implementation/IMP-001-red-on-base.md` (38 reproductions fail on the base's production code).

## Checks (`evidence/implementation/IMP-002-checks.md`)

- **Web unit suite:** 6,369 passed, 1 failed, 2 skipped, with 1 unhandled error. Neither failure is from this ticket; see
  Observations.
- **Web typecheck:** PASS. Production 0 errors; test files at the baseline (85).
- **Server unit suite:** 9,166 passed. Its one failure, `tracked-imports`, was the then-uncommitted new module; it passes
  after the commit.
- **Server typecheck:** PASS (production 0, tests at baseline). **Server build:** passes.
- **Guards and audit:** web boundary, localization boundary and literal audit all pass.
- **AC-008:** `wc -l` 482 and 446 (both under 500); no importer of the old name; `git diff --check` clean.

## Probes and prototypes (each on its own temp stack, removed after; 0 unknown browser errors)

| AC | Evidence | Base | This branch |
| --- | --- | --- | --- |
| AC-009 | `IMP-003-wire-order.md` | Wire under a moving clock: **724 / 8000** out of order | **0 / 8000**; SGD-06 × 10 at 150 ms: **10 Pass**, 0 gap lines, 0 out of order |
| AC-001 | `IMP-004-ac001-desktop-and-phone.md` | Desktop SDD-14 and phone MSP-119: **Fail**, no replacement stream | **Pass**: replacement snapshot 39–54 ms (desktop) and 27–38 ms (phone) after the gap, 0 failed attempts; Idle, no notice, the next send on the new stream |
| AC-002 | `IMP-006-ac002-recovery-keeps-failing.md` | Desktop SDD-15: **Fail** (a send is refused at once; no recovery) | Desktop SDD-15 and phone MSP-120: **Pass**: the send waits 10.0 s, then text (a) with the text back; the notice at the 5th failure (15.0 s); after the reads pass, recovered at 31 s and the notice gone |
| AC-004 | `IMP-005-ac004-old-vs-new.md` | SDD-12, SDD-13, SDD-07 and SDD-09: **Fail** (Initializing at 3.4–3.8 s; Send disabled after the notice) | **Pass**: the status before the loss throughout; Send enabled before and after the notice |

- **AC-005** has no probe. Opening a live run takes D-B1's path only when the page holds no context for it yet. In a
  loaded page, the history refresh builds an active run's context first (with its history status), so a browser cannot
  reach that path deterministically. The web spec covers it (the `agentRunOpenCoordinator.spec` D-B1 table).
- **AC-006** (a race) and **AC-007** (labels) are web specs, as their Verification column says.

## Observations For The Solution Designer (not this ticket's)

- **The web suite's fixed-px font audit fails on the base.** `tests/integration/app-font-size-fixed-px-audit.integration.test.ts` flags `components/settings/nodes/NodeRow.vue` `text-[11px]` at line 39, from `aba07b35e3` (autobyteus-581, WIP). This ticket does not touch either file.
- **The unhandled "window is not defined" in a full web run.** Apollo Client's devtools-suggestion timer (10 s after a worker's first `new ApolloClient`) reads `window` after jsdom was torn down. The trigger is `stores/__tests__/agentOrgHistoryApollo.spec.ts`, which builds its own client; it shows only when that worker is still alive 10 s later. Not from this ticket.
- **A live Team stream's invalid snapshot leaves it waiting.** One that is not a recovery candidate (`TEAM_EXECUTION_SNAPSHOT_INVALID`, or a base mismatch) is logged and dropped by `handleMessage`. The stream then stays `awaiting_snapshot` and never enters `reopen_required`, so no recovery starts. This is existing behavior outside A's paths, noted for N-2's question.
- **The recovery read refuses while the Team works.** `hydrateTeamRunContextForStreamRecovery` refuses while the Team has open execution work (`TEAM_STREAM_RECOVERY_WAIT`), so a gap in the middle of a turn recovers at the first attempt after the turn ends. That is the design's unchanged verified replacement. A long turn can reach `exhausted` (5 failures, about 15 s) before it ends; the attempts go on and the notice goes at the commit.
