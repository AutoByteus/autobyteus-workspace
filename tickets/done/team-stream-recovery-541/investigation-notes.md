# Investigation Notes

## Meta

- Package: `team-stream-recovery-541`. Task autobyteus-541 (merges 533 FU-001…005, FU-007 and 540 FU-001…003; autobyteus-542, 543, 552 and 553 cancelled into it), Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`.
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-stream-recovery-541`
- Branch: `codex/team-stream-recovery-541`
- Base: `origin/personal` @ `80420a8bf6` (2026-11-27). Finalization target: `origin/personal`.
- Authorities read:
  - the solution-designer skill;
  - requirements-engineering, finding-the-cause, ticket-scope, architecture-design and design-principles;
  - `DESIGN.md`;
  - the two tickets' `follow-ups.md` and 533's API-08 evidence.
- Each finding is marked **Measured** (a run or probe output), **Proven** (a prototype isolating the mechanism) or **Read** (code).

## A. The Team stream that never reopens (533 FU-005)

### What the page does (Read)

- Any frame whose `change_sequence` is not exactly the next one makes `teamExecutionViewState.applyMessage` return `TEAM_EXECUTION_CHANGE_SEQUENCE_GAP` with the effect `team_stream_recovery_required` (`advanceSequencedStream`, `sequencedStreamRange.ts:11`).
- `TeamStreamingService.enterReopenRequired` (`:410`) then:
  - closes the socket, settles Stops and drains sends;
  - never reconnects;
  - raises the notice.
- `agentTeamRunStore` stores the notice. The desktop shows "Live Team updates are out of sync. Wait…, then select this Team member again…" (an English literal, `TeamWorkspaceView.vue:44-47`); the phone shows nothing.
- Recovery happens only when the user selects the member again (`runHistorySelectionActions.ts:81` → `reopenTeamRunAfterStreamLoss`, `teamRunOpenCoordinator.ts:93`).
- Until then:
  - members keep their last status (Running), so Stop is offered;
  - a Stop answers "not sent";
  - a send throws `TEAM_STREAM_REOPEN_REQUIRED` ("Select this Team member again…", `agentTeamRunStore.ts:133`).
- **The Org stream recovers itself:** the same state starts a transparent recovery on the reconnect scheduler's cadence, and a notice appears only after persistent failure (`agentOrgStreamingService.ts:66-110`, `workspace.agentOrg.recovery.exhausted`).

### The server's order (Read)

- `RunViewStream.publish` numbers and delivers synchronously (`run-view-stream.ts:65-73`).
- `SnapshotBarrier` hands a snapshot connection the frames after its base, none lost and none twice (`snapshot-barrier.ts`).
- `TeamViewSession.show` projects and sends in order (`team-view-session.ts:183-207`).
- The sequenced egress has no filters, and keeps every sequence (`agent-stream-egress-control-composition.ts:31-52`, `sequenced-content-cadence-scheduler.ts`).
- `ws` and TCP do not reorder frames.

### Reproduction (Measured)

- Method: 533's probe `tests/e2e/stop-generation-probe.mjs --cases SGD-06 --latency-ms 150` (scripted AGY CLI, no keys, my own temp stack). Its wire was widened temporarily to log every frame with its `change_sequence`; that change is reverted, see Cleanup.
- Runs 1–3 under `/tmp/sd541/run{1,2,3}`:
  - run 1 and run 2: Pass;
  - **run 3: the gap.** Page console: `Rejected Team execution message (TEAM_EXECUTION_CHANGE_SEQUENCE_GAP): Expected change sequence 3, received 4`, then "Team message admission was cancelled because Team stream recovery is required". The case failed with "Send enabled" timing out, the user-visible symptom of FU-005.
- **The frames the page got on that link: 1, 2, 4, 3.** `AGENT_STATUS initializing 1` at :55.622, `AGENT_INPUT_STATE 2` at :55.902, `AGENT_INPUT_STATE 4` at :55.904, `AGENT_STATUS initializing 3` at :55.905. Frame 4 arrived before 3, one millisecond apart.

### The cause: the probe's wire reorders frames (Proven)

- `fixtures/stop-generation-wire.mjs` `schedule()` computes `due = max(Date.now() + latency, link.dueDown)`, then calls `setTimeout(deliver, due - Date.now())`. The second `Date.now()` can read one millisecond later, which gives a 149 ms timer behind a 150 ms one.
- Node orders timers of equal expiry by their timer list. A frame scheduled 1 ms later with the shorter duration can fire first.
- Prototype `/tmp/sd541/proto/wire-order.mjs` replays that `schedule()` for frames about 1 ms apart: **815 of 8,000 deliveries out of order.**
- So 533's API-08 gap was the probe reordering two adjacent frames. Its wire log then skipped `AGENT_INPUT_STATE` and `MEMBER_INPUT_MESSAGE` (not in `KEEP`), which hid the evidence.
- A real network does not reorder: a WebSocket rides one TCP stream.
- Confirming runs 4 to 20, with the node-side arrival order logged per frame, are recorded in "Confirming runs" below.

### What remains a product problem (Read)

- Any real gap, now or in the future (a server defect, a contract change), leaves the Team view stuck until the user reselects:
  - members look live;
  - Stop "not sent";
  - Send refused with "select again";
  - the phone has no notice at all.
- The Org already recovers by itself. **The Team's recovery behavior is this ticket's** (the Task's goal: "show the truth, recover by itself").

## B. Opening a run (533 FU-007, FU-002)

- **FU-007 (Read):**
  - `agentRunOpenCoordinator.ts:59` captures `expectedContext`, awaits the read, and throws "Agent run … changed before projection commit" (`:92`) when another builder committed a context meanwhile.
  - The other builders:
    - the history refresh (`runHistoryLoadActions.ts:337` `hydrateLiveRunContext`);
    - delegated runs (`delegatedRunsStore.ts:99`);
    - navigation (`workspaceNavigationService.ts:129`).
  - The throw reaches `useWorkspaceHistorySelectionActions.onSelectRun`, which logs "Failed to open run: …".
- **FU-002 (Read):**
  - `:79` `liveStatus = isActive ? Running : Offline`. The resume config carries no status (`RunResumeConfigPayload`, `runHistoryTypes.ts:93`).
  - The run's own status is already on the page: `useRunStatusStore().statusOf(runId)` (`/ws/run-status`, SR-083). It is what the Runs tree row shows, and the row is what the user clicked.
  - The stream's `AGENT_STATUS` on bind then takes over.

## C. A Team member while its stream is disconnected (540 FU-003)

- **The mechanism (Read):** on each history refresh, an active Team whose stream is not ready (and not reopen-required) gets `applyActiveRuntimePlaceholder` on every member, which forces `Initializing` (`runHistoryLoadActions.ts:370-388`, `agentRuntimeStatusState.ts:45-53`).
- `resolveAgentPrimaryAction` disables the composer for `Initializing` (`agentPrimaryAction.ts:32`).
- The Team send path calls `refreshTreeQuietly()` before it waits, so a send brings it sooner (540 evidence).
- An existing Team context keeps its stream for its life (SR-045). So "stream not ready" there means the transport is lost or connecting, and the stream's next snapshot sets every member's status anyway. The placeholder only overwrites the last known status.
- The same placeholder sits on the standalone branch (`:330`): an active standalone run whose stream dropped turns `Initializing` too.
- `services/runRecovery/activeRunRecoveryCoordinator.ts` (and its spec) also applies the placeholder. It has **no production caller** (only its spec imports it): dead code in a touched area.
- Reproduction: 540's `send-delivery-probe.mjs` SDD-12 and SDD-09 on this base. The results are under "Reproduction of C" below.

## D and E (Read)

- `MessagePrimaryActionButton.vue:40`: "Send message" and "Stop generation" literals.
- `team-tool-approval-command-handler.ts`: `!input.activeRun` branch and nullable `activeRun`; its only caller passes `routed` (`agent-team-stream-handler.ts:136`); `teamRunId` is used only in log text.
- `CollaborationMessagesOrgRoot.integration.spec.ts:177` with 42,000 references and the 5 s default (533 FU-004).
- `agentOrgContextsStore.ts` and `agentOrgStreamingService.ts` are 506 lines each. `agentOrgConnectionLostError.ts` holds `AgentOrgConnectionLostError` and `orgCommandFailure`, with 4 importers.

## Confirming runs and the real wire (Measured, Proven)

- Runs 4–20 (`SGD-06`, 150 ms, the node-side arrival order logged per Team frame): no inversion and no gap. Across runs 1–20, the reorder appeared once (run 3).
- The probe's own wire module, driven directly: `evidence/investigation/real-wire-order.mjs` feeds `createStopWire().link().fromNode` numbered frames about 1 ms apart at 150 ms latency. **1 of 8,000 delivered out of order when idle.** Under the probe's load (Chrome, Nuxt, the node) the clock moves between the two reads more often, which fits once in 20 runs.
- The replica `wire-order.mjs` widens the window between the two reads: 815 of 8,000.
- Evidence: `evidence/investigation/A-run3-team-frames.json` (1, 2, **4, 3**) and `A-run3-console.log` (the gap and the cancelled send).
- Honest limit: the node-side order of the one reordered run was not recorded (arrival logging was added after it). The mechanism is shown by the real wire module, and the server path is synchronous (Read).

## Reproduction of C (Measured, base `80420a8bf6`)

- 540's `send-delivery-probe.mjs --cases SDD-12,SDD-09` (`evidence/investigation/C-sdd-old-base.json`):
  - **SDD-12:** path down, no send: the member goes `Idle` → **`Initializing` at 3.7 s**; `Idle` after the path is back.
  - **SDD-09:** right after the loss Send is disabled (`enabled: false`), the status is `Initializing`, and after the not-sent notice (10.0 s) Send is **still disabled**. After the path is back: `Idle`, Send enabled.
- Both cases "pass" only because the probe accepts the status the loss alone gives. They are the regression reference for AC-004.

## Cleanup of the investigation

- The wire's temporary edits (`KEEP`, `through`, `from-node`) are reverted (`git checkout`).
- `/tmp/sd541` holds the runs. I remove it at the end of the ticket.
