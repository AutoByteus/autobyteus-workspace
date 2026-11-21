# Implementation Handoff — autobyteus-591

Closing a Task on node A stops its remotely delegated agent or team on peer B, as for a local delegated run (DEC-004).
Its assigner's message after the Task's reopen continues the run, and a different saved Task brings it back (REQ-006, as corrected at SR-010).

All paths are relative to the worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-node-task-close-591`
unless absolute; server paths are under `autobyteus-server-ts/`.

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: Medium / High, so it was independently reviewed. ARCH-REV-003 passed (SR-008) and ARCH-REV-004 passed (SR-009). The code reviewer passed IR-001 (CRR-001). API/E2E round 1 (API-REV-001) failed on F-1 and F-2, which CRR-002 classified as Requirement Gaps (CR-591-001 … 003). The Solution Designer corrected the basis (SR-010, SR-011), and ARCH-REV-006 passed it. Code review is next.
- Requirements doc: `tickets/in-progress/cross-node-task-close-591/requirements-doc.md`
- Investigation notes: `tickets/in-progress/cross-node-task-close-591/investigation-notes.md`
- Solution revision record: `tickets/in-progress/cross-node-task-close-591/solution-revision-record.md` (SR-001 … SR-011)
- Design spec: `tickets/in-progress/cross-node-task-close-591/design-spec.md`
- Supplemental task artifacts: `tickets/in-progress/cross-node-task-close-591/handoff-architecture-review-sr006.md`
- Design review report: `tickets/in-progress/cross-node-task-close-591/design-review-report.md` (the reviewer's; not committed by me)
- Architecture review revision record: `tickets/in-progress/cross-node-task-close-591/architecture-review-revision-record.md` (the reviewer's; not committed by me)
- Triggering rework report: `design-review-report.md` Rounds 5–6 (ARCH-REV-006); `code-review-report.md` (CRR-002, CR-591-001 … 003); `api-e2e-execution-coverage-report.md` (API-REV-001, F-1, F-2)

## Current Implementation Summary

- Implementation cycle: `Rework` (round 2)
- Implementation revision record: `tickets/in-progress/cross-node-task-close-591/implementation-revision-record.md`
- Current implementation revision ID: `IR-002` (IR-001 was the initial round)
- Related solution revision IDs: SR-001 … SR-011
- Related architecture-review revision IDs: ARCH-REV-001 … ARCH-REV-006
- Related code-review revision IDs: CRR-001 (Pass), CRR-002
- Related API/E2E revision IDs: API-REV-001
- Related delivery revision IDs: N/A
- Triggering finding IDs: CR-591-001 (F-2), CR-591-002 (F-2 b), CR-591-003 (F-1), AR-003; the stale "fences" test title from CRR-002

What it does, by node:

- **A (the delegating node).**
  - `PeerRunStateNotices` (new) is the one owner of what a peer run's node is told. Per run, one notice is in flight at a time; the next waits for the previous answer. The state is read from `isOpen` when the notice is sent, and a change made while a notice is in flight is sent again in the same turn.
  - Owed notices are persisted as `peerNoticeOwed: true` on the run's Task entry. While a peer has owed notices, one 30 s unref'd timer per peer sends them. They are loaded at start from the loaded entries.
  - The closure's release sends closed runs on peers to the notices, in place of the `FENCED_REMOTE` skip.
  - `toExistingRun` gives a saved Task to a remote run:
    - The local conversation check is skipped, and a Task with files is refused.
    - The new entry keeps the run's node and members.
    - B must confirm "open" before the work is sent over the link, through `deliverMessageToPeerRun`, which was extracted from the router so both use it.
    - The same closed Task gets the local refusal, which says to message the run (unchanged Task-side rule).
  - **IR-002, DN-9: the assigner's continuation, as locally.** Every `send_message_to(run ID)` passes one peer-run admission, `CrossRunMessageDelivery.admitPeerRun`. `GlobalAgentRunMessageRouter.deliver` calls it once, right after normalizing, before the sender root's endpoint, `node` or `route`, and outside any root's gate. Its rules:
    - an open peer run is admitted;
    - a closed one whose last entry is `assigned` and was assigned by the sender: `assertReopenable` and `reopenAssignment` (no local restorability check), then the notices tell B "open" after any in-flight notice, and the message is admitted once B confirms;
    - otherwise `TASK_AGENT_RESOURCE_CLOSED`.

    `closedPeerRunRefusal` and `route`'s peer branch are removed, and `deliverMessageToPeerRun` no longer checks the Task.
- **The link.** `POST /rest/remote/delegated-run-states` `{run, open}` goes through `PeerGateway.admit`, then the stored owner link check.
- **B (the node that runs it).**
  - `DelegatedRunStateHandler` handles both states:
    - Closed: it records the run, stops it through the closure Stop, and answers after the Stop.
    - Open: it removes the record.
  - `ClosedDelegations` is the only record, kept in `closed-delegations.json`.
  - The run list leaves out recorded runs, checked in memory.
  - An accepted linked message or work packet from the delegating node clears the record (S-5), and so does the run's delete on B.

## Routing Classification (Mandatory)

- Task size: `Medium`
- Architecture risk: `High`
- Design classification section / evidence reference: `design-spec.md` § Task Size And Architectural Risk (`task_size: Medium`, `architectural_risk: High`)
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: as designed, the change adds a new cross-node contract, a persisted field on each side, a stop across nodes and a retry loop. The implementation added no new kind of impact. Its size is about 610 added source lines: 368 in four new files, plus 239 added and 46 removed in 20 changed files, with tests and docs on top.
- Selected route: `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None` open. In IR-001, DN-6's premise failed; I raised it as a Design Impact, and SR-009 and ARCH-REV-004 resolved it. IR-002 implements SR-010 and SR-011 as written; IR-002 adds about 60 source lines.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 (REQ-001; AC-001, AC-002, AC-003) | A closed Task's peer run that has no other open Task stops on its node | `ProjectTaskService.closeAndWrite` → `TaskExecutionResourceRelease.stop` → `noticePeerRun` → `PeerRunStateNotices.changed`, which marks the notice owed, reads `isOpen` and sends through `PeerClient.deliveredRunState` → B `PeerGateway.deliveredRunState` → `DelegatedRunStateHandler.apply`, which records in `ClosedDelegations` and then calls `AgentRunService` or `TeamRunService.stopForTaskClosure` → the answer → the owed mark is cleared | Implemented. A run with another open Task isn't in `releasable()`, so nothing is sent (AC-003; unit IMP-03). A whole Team stops, a working member included (IMP-03 team AC-002). |
| BEH-002 (REQ-002; AC-004) | An undeliverable notice is delivered once the peer is reachable, also after a restart; never for a run whose entry was reopened first; a Task's reopen alone doesn't prevent it (SR-010) | `peerNoticeOwed` on the entry (domain `setPeerNoticeOwed`, schema, `TaskExecutionResourceService.setPeerNoticeOwed` / `owedPeerNotices`); `PeerRunStateNotices.start` at composition; per-peer 30 s timer (`retry`) | Implemented. The mark survives a restart (IMP-03). A restart of B: the run resumes as today, and the next retry stops it. When the entry is opened again before B is reachable, by the assigner's message (IR-002) or another Task, the owed notice becomes "open" and B never stops the run (in-process tests). A Task's reopen alone changes no entry, so the owed "closed" is still sent, as REQ-002 now says. |
| BEH-003 (REQ-003; AC-005) | Only the caller's own delegation | `PeerGateway.admit` (pairing, signature, node) → `storedLinkCheck(run, {kind: "owner", fromNodeId, targetAgentRunId: null})` | Implemented. Another peer's request is refused `REMOTE_TARGET_NOT_PERMITTED`, and nothing is recorded or stopped (IMP-03, the third-node test). |
| BEH-004 (REQ-005; AC-006) | The run leaves B's list (desktop and phone) and returns when it is given a Task again | `WorkspaceRunHistoryService.listed`, a `topLevel` row check plus `!closedDelegations.has(run)`, in memory, for both list reads | Implemented. Live signal verified: desktop and phone re-read `ListWorkspaceRunHistory` every 5 s (`RUN_HISTORY_REFRESH_INTERVAL_MS = 5000`, `useRunHistorySectionLoad.ts`, used by `RunSectionPanel.vue` and `MobilePairedShell.vue`), so no publisher is added (see Deviations). |
| BEH-005 (REQ-004) | A stopped run keeps memory, log and history; a later message wakes it | Unchanged run Stop paths; nothing is deleted. B's record is cleared by a linked message from A (S-5) | Preserved (IMP-03: the run wakes with the follow-up work). |
| BEH-006 (REQ-006; AC-007), continuation (IR-002, DN-9) | After the Task's reopen, its assigner's message continues the closed remote run; another sender is refused; `delegate_task` with the same Task gets the local refusal | `GlobalAgentRunMessageRouter.deliver` → `CrossRunMessageDelivery.admitPeerRun` (open: admitted; the last `assigned` entry's delegator: `assertReopenable` → `reopenAssignment` → `PeerRunStateNotices.changed` → admitted once B confirms; else `TASK_AGENT_RESOURCE_CLOSED`) → the router's usual path: the sender root's endpoint (`deliverExactAgentMessage` → `remoteSend`) or `node` (`deliverMessageToPeerRun`) → B's S-5 clear and wake | Implemented for an agent run (endpoint path and `node`) and a team coordinator (IMP-08). If B isn't reached, the entry stays open, "open" stays owed, and the answer is the notice's refusal (`PEER_UNREACHABLE`) saying to send again; the next message goes through. An owed "closed" from an unreachable close is replaced by "open", so the run is never stopped. A Task still DONE refuses the assigner with the Task side's text. |
| BEH-006 (REQ-006; AC-007), a different saved Task (IR-001, DN-8) | A different saved Task can be given to an existing remote run, as locally | `TaskDelegation.toExistingRun`: the `:370` refusal is removed; the conversation check is skipped for a `nodeId` entry; a Task with files is refused before anything changes; `assignExistingTaskExecution` (the entry keeps `nodeId`/`members`); `toPeerRunAgain` → `peerNotices.changed` (after any notice in flight) → `deliverToPeerRun` port (`deliverMessageToPeerRun` → sender root `deliverToPeerRun`, a linked message) | Implemented for an agent and a team coordinator (IMP-03). A reopen alone changes nothing on either node. Unreachable B: the work isn't delivered, the entry is `failed`, and "open" stays owed. |
| BEH-005 (REQ-004; AC-001, AC-006) on A | A closed remote run leaves its delegator's tree, and its Task page shows it offline, as locally (SR-010, CR-591-003) | `RunTreeView`'s open subtree, unchanged | Unchanged code: SR-010 aligned the requirement with it (F-1). |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`.

## Key Files Or Areas

New:
- `src/agent-collaboration/execution/remote/peer-run-state-notices.ts`: A's notices, per-run order, owed and retry.
- `src/remote-collaboration/inbound/closed-delegations.ts`: B's record (also `NO_CLOSED_DELEGATIONS` for the application host).
- `src/remote-collaboration/inbound/delegated-run-state-handler.ts`: B's handler.
- `src/agent-communication/services/peer-run-message-delivery.ts`: `deliverMessageToPeerRun`, extracted from the router.

Changed (A):
- `src/projects/runtime/task-execution-resource-release.ts`: the `FENCED_REMOTE` branch and comment are removed, and the notice takes their place.
- `src/projects/domain/task-execution-resources.ts`: `peerNoticeOwed`, `setPeerNoticeOwed`, and `linkExistingTaskExecution` carrying `nodeId`/`members`.
- `src/projects/stores/task-execution-resource-schema.ts`: reads and writes `peerNoticeOwed` (only `true`, on a peer's run only).
- `src/projects/services/task-execution-resource-service.ts`: `setPeerNoticeOwed`, `owedPeerNotices`, and `assignExisting` keeping the previous entry's node and members.
- `src/projects/services/project-task-service.ts`: the `noticePeerRun` dependency (required, as `requestRelease`).
- `src/agent-collaboration/execution/task/task-execution-resource-port.ts`: the `PeerRunStateNotice` port type.
- `src/agent-collaboration/execution/task/task-delegation.ts`: the remote branch of `toExistingRun` (`toPeerRunAgain`), and the `deliverToPeerRun` and `peerNotices` dependencies.
- `src/agent-communication/services/global-agent-run-message-router.ts`: `deliverToPeer` calls `deliverMessageToPeerRun`. IR-002: `deliver`'s first step after normalizing is `admitPeerRun`, and the `node` path no longer has its own check.
- IR-002, `src/agent-collaboration/communication/cross-run-message-delivery.ts`: `admitPeerRun` (DN-9) and the `peerNotices` dependency. `closedPeerRunRefusal` is removed, and `route` returns `null` for a peer run.
- IR-002, `src/agent-communication/services/peer-run-message-delivery.ts`: no Task check (its callers admitted the message).
- `src/compositions/collaboration-composition.ts`: builds, starts and closes `PeerRunStateNotices`, wires the ports, and takes the `closedDelegations` input for the run list. IR-002: passes the notices to `CrossRunMessageDelivery`.

Changed (link):
- `src/remote-collaboration/domain/remote-requests.ts`, `channel/peer-client.ts`, `channel/peer-gateway.ts`, `src/api/rest/remote.ts`, `agent-collaboration/execution/remote/remote-run-channel.ts`.

Changed (B):
- `src/remote-collaboration/inbound/remote-message-receiver.ts`: S-5 `reopened` after an accepted message or work packet.
- `src/remote-collaboration/remote-collaboration-services.ts`: the handler slot.
- `src/compositions/remote-collaboration-composition.ts`: builds the handler and passes the record.
- `src/run-history/services/workspace-run-history-service.ts`: the required `closedDelegations` and the `listed` rule.
- `src/compositions/build-studio-server.ts`: loads the record once at start and fans the run-delete notice out to it.
- `src/standalone-application-host/start-standalone-application-host.ts`: passes `NO_CLOSED_DELEGATIONS`.

Docs:
- `docs/design/collaboration_model.md`: CM-7, CM-10, § 3 layout, § 4 (the item moves from "later steps" to a held item), § 5.
- `GLOSSARY.md`: delegation state, closed delegation, owed notice.
- `docs/design/node_access_model.md`: NAS-41.
- `docs/modules/remote_collaboration.md`: the new section "A remote run's delegation state".
- `docs/modules/projects.md`, `agent_communication.md`, `agent_team_execution.md`: the stale "fenced, not stopped" and "takes no saved Task" text.
- IR-002: the continuation in `collaboration_model.md` § 4 and § 5, the remote case in `projects.md` § Reactivation, the peer-run admission in `agent_communication.md` and `remote_collaboration.md`. `closedPeerRunRefusal` is no longer named anywhere.

Tests:
- New: `tests/unit/agent-collaboration/execution/peer-run-state-notices.test.ts`, `tests/unit/remote-collaboration/closed-delegations.test.ts` (with the handler), `tests/unit/projects/task-peer-notice-owed.test.ts`.
- Extended: the two-node in-process suites `standalone-remote-delegation.test.ts` and `team-remote-delegation.test.ts`; `peer-gateway.test.ts`; `remote-message-receiver.test.ts` (S-5); `workspace-run-history-service.test.ts` (DN-6); `task-execution-resources.test.ts`.
- Fixtures and helpers: `task-execution-resource-fixtures.ts` (owed mark), `explicit-host-collaborators.ts` (`NO_PEER_RUN_PORTS`, `noticePeerRun`), `task-side-binding.ts` (peer-run ports).
- `typecheck-baseline.json` shrank by 4 test errors, because the team harness now types its directories.
- IR-002:
  - `cross-run-message-delivery.test.ts`: the `closedPeerRunRefusal` cases are replaced by six `admitPeerRun` cases.
  - `global-agent-run-message-router.test.ts`: the admission runs first on the sender root's endpoint path (AR-003), and the `node` cases.
  - Two-node in-process tests:
    - `standalone-remote-delegation.test.ts`: the assigner through the endpoint, another sender, an owed "closed", and the `node` path;
    - `team-remote-delegation.test.ts`: the coordinator, and the "fences" title fixed.
  - Stubs updated in three other suites.

## Important Assumptions

- Both nodes run the same release (CM's channel has no version negotiation). An older B answers HTTP 404 on the new route. A maps that to `PEER_UNREACHABLE`, keeps the notice owed, retries quietly (the reason is logged once), and a follow-up Task to that run isn't delivered. A refused that follow-up before, too.
- A run on a peer can't be re-delegated with files, because file transfer is autobyteus-587. A Task with files is refused before anything changes, with the existing attachments text.

## Known Risks

- **Deviations from the design text, each checked against its intent:**
  1. **B's Stop uses `AgentRunService` / `TeamRunService.stopForTaskClosure(runId, stillClosed)`, not the owner's `terminate` calls (DN-2).** The owner path answers "not stopped" for an inactive Team, which would keep an idle Team's notice owed forever. The closure Stop treats a run that isn't running as stopped. `stillClosed = closed.has(run)` is the cross-node counterpart of `kept_open`: if an inbound linked message from A cleared the record while the Stop waited, the run keeps running, and the answer is `open: true`.
  2. **Each `ClosedDelegations` entry also stores the delegating `nodeId` (DN-5 lists `{kind, runId, closedAt}`).** S-5 clears the record only for a message from that node (`openedBy`). A node the run itself delegated to may message it too, and that says nothing about A's Tasks. An entry without a node is cleared by any accepted linked message.
  3. **No run-list publisher (DN-2 step 2, DN-6).** The live signal is the 5 s list re-read on desktop and phone, as verified above. A local closure leaves the list the same way.
  4. **`PeerRunStateNotices` exposes one call, `changed(run)`, which resolves when the run's turn ends (DN-1b's `settled`).** The re-delegation awaits it. A separate `settled` would have been an unused second entry point.
  5. **Dependency rules list the peer directory as a dependency of the notices; it isn't one.** `PeerClient.call` already refuses with `PEER_NOT_REGISTERED` when `findByNodeId` is null, so the notices drop on that code without a second lookup.
  6. **`PEER_NOT_PAIRED` keeps the notice owed.** DN-4 drops only on "no longer paired (`findByNodeId` null)", which is `PEER_NOT_REGISTERED`. A peer shown "Pair again" can still be told after re-pairing.
  7. **IR-002: DN-9 says `await notices.settled(run)` after the reopen; the code calls `notices.changed(run)`.** This follows deviation 4, which CRR-001 accepted. The reopen changed the run's entry, so `changed` is the right call: it marks the notice owed, waits for any notice in flight, then sends the state read at send time ("open") and resolves on B's answer. That is what `settled` was meant to do.
  8. **IR-002: when B isn't reached, the refusal keeps the notice's code (`PEER_UNREACHABLE` for an unreachable node, B's code otherwise) and adds the local continuation's sentence** ("… continues with its conversation (its Task is open again) but did not receive this message; send it again"), because the entry has been reopened.
- **IR-002 ordering note.** A second message from the assigner while the first continuation's "open" is still in flight is admitted at once (the entry is open, rule 1) and may reach B before the "open" notice. B's S-5 clears the record when it accepts the message, and B's Stop re-checks the record (`stillClosed`), so an older "closed" can't stop the run after that. This is the same `kept_open` interplay as for a re-delegation.
- **Run delete on B (ARCH-REV-004 note 1):** hooked cheaply. The studio fans the existing committed-delete notice (`runDeleted`, given to the agent, team and org run services) out to the episodic catalog and to `ClosedDelegations.runDeleted`. The application host takes no peer delegations.
- **A repeated DONE while a confirmation's clear is being written** can leave a stale `peerNoticeOwed` on the file with nothing owed in memory. A restart then sends the same state once more, which is idempotent on B. A real state change in that window is re-checked and sent (`send` re-reads `isOpen` after the clear).
- **A remote team's Stop on B** goes through `terminateTeamRunForTaskClosure`, which interrupts a working member first. The two-node test drives this with the real Team stack and a fake runtime. Real runtimes are API/E2E's.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: replace the skip with an owner and a link request; B gets one record.
- Reviewed root-cause classification: a missing behavior. The close skipped remote runs (F-1, the founder's `server.log:3191044`).
- Reviewed refactor decision: `No Refactor Needed`, apart from the planned extraction of `deliverMessageToPeerRun`.
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `Yes`. DN-6's index-row premise failed; SR-009 resolved it.
- Evidence / notes: the router's tests are unchanged and green (`tests/unit/agent-communication`, `send-message-to.test.ts`, `running-agents-messaging.test.ts`; IMP-03).

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`. The `FENCED_REMOTE` branch, its log code and its comment are gone, and the `:370` refusal is removed. `REMOTE_ROOT_REFUSAL_TEXT.savedTask` stays: `RemoteDelegation` still uses it for a *new* peer run with `task_id`.
- Dead code in the touched files and modules removed (Core Principle 7): `Yes`
- Dead code found elsewhere, added to `follow-ups.md`: None
- Shared structures remain tight: `Yes`. The entry's new field is optional and peer-only; the record is its own type; no base was widened.
- Canonical shared design guidance was reapplied during implementation: `Yes`
- Deviations from a design principle decided during implementation: None (the design-text deviations are in Known Risks)
- Changed source implementation files stayed within the size guardrails: `Yes`. Effective lines: `task-delegation.ts` 464 (was 442), `project-task-service.ts` 472 (was 470), `build-studio-server.ts` 447 (was 439), `peer-client.ts` 437. No file is over 500, and no file's delta is over 220.
- Notes: the application host passes explicit "none" values (`remoteChannel: () => null`, `NO_CLOSED_DELEGATIONS`), as autobyteus-500 FU-011 requires.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Directly Usable — No Migration` for both. A's `peerNoticeOwed` is an optional field, and B's `closed-delegations.json` is a new file; absence means "nothing owed" and "open".
- Design-spec decision reference: `design-spec.md` § Persisted Data / State Transition Decision; DN-3, DN-5.
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`
- Direct-use evidence:
  - The current Task reader has no exact-key check per entry, so an older build reading a file with `peerNoticeOwed` ignores it (`parseEntry` builds from known fields).
  - The new reader rejects the field only when it isn't `true`, or when it is on a run of this node (IMP-03, schema test).
  - B's reader is tolerant: an unreadable file means empty with a warning, and invalid entries are skipped. An older build doesn't read the file, so the runs are listed again, which is harmless.
- Migration implementation: N/A
- Deviation: `None`

## Environment Or Dependency Notes

- The worktree had no `node_modules`. I ran `pnpm install --frozen-lockfile` at the worktree root, and it changed nothing tracked. The untracked `autobyteus-application-*/dist/` folders are build outputs of `pnpm typecheck`'s prepare step and are not committed.
- No provider keys were used; no live provider was needed.

## Checks Run

Environment: macOS (Darwin 25.5.0), Node 22, pnpm 10.28.2. Evidence is in `tickets/in-progress/cross-node-task-close-591/evidence/`. IMP-01 … IMP-06 are IR-001's (code `9abe7086fd`); IMP-07 … IMP-10 are IR-002's, on the handed-off code `a811f94348`. IR-002 changes no file that IMP-05 exercises: the four E2E files and the run-history code were not touched.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `pnpm -C autobyteus-server-ts typecheck` | `77ca417ac3` (`9968ee0c73` and `9abe7086fd` change only test cases and names) | macOS, Node 22, pnpm 10.28.2 | server `src` and `tests/` | all | Pass | `evidence/IMP-01-server-typecheck.log` | `[typecheck] production errors: 0; test-file errors: 1002 in 314 files (baseline 1002 in 314 files)` and `[typecheck] PASS`; the baseline shrank 1006 → 1002 (team harness now typed) |
| IMP-02 | `pnpm -C autobyteus-server-ts test:unit` | `9968ee0c73` | same | the whole server unit, migration, architecture and journal suites | all | Fail (1): the node access contract scan found NAS-41 (added in this change) named in no test; fixed in `9abe7086fd` by naming it in two tests, rerun in IMP-06 | `evidence/IMP-02-unit-full.log` (excerpt; the full log is at `/tmp/r591/IMP-02-unit-full.log` on this machine) | `Test Files  1 failed \| 1046 passed \| 5 skipped (1052)` / `Tests  1 failed \| 8677 passed \| 9 skipped (8687)`; the only failure is `AssertionError: expected [ 'NAS-41' ] to deeply equal []` |
| IMP-03 | `pnpm -C autobyteus-server-ts exec vitest run <the ticket's 11 test paths> --reporter=verbose`, then the two `send_message_to(node)` suites | `9968ee0c73` | same | `PeerRunStateNotices`, `ClosedDelegations`, `DelegatedRunStateHandler`, the owed mark (domain, schema, service), the release, `toExistingRun`, the gateway route, the S-5 clear, the list filter, the router, and the two-node in-process agent and team suites | BEH-001 … BEH-006; AC-001 … AC-005, AC-007 in process; S-5; U-1; ARCH-REV-003 note 1; ARCH-REV-004 note 1 | Pass | `evidence/IMP-03-focused-tests.log` | `Test Files  13 passed (13)` / `Tests  139 passed (139)`, then `Test Files  2 passed (2)` / `Tests  17 passed (17)`; the test names start `AC-001`, `AC-001, AC-002`, `AC-003`, `AC-004`, `AC-004's alternate`, `AC-005`, `AC-007`, `S-5`, `DN-1b`, `DN-4` |
| IMP-04 | `pnpm -C autobyteus-web typecheck` | `9968ee0c73` | same | the web app and the cross-package tests that compile server `src` | — | Pass | `evidence/IMP-04-web-typecheck.log` | `[typecheck] production errors: 0; test-file errors: 86 in 36 files (baseline 86 in 36 files)` and `[typecheck] PASS` |
| IMP-05 | `pnpm -C autobyteus-server-ts exec vitest run` on the four E2E files that build `WorkspaceRunHistoryService` (`archive-run-history-graphql`, `standalone-error-termination-lifecycle`, `recent-run-projection-graphql`, `run-projection-toolcalls-graphql`) | `9968ee0c73` | same | the run list over GraphQL with the required `closedDelegations` input | BEH-004 (unchanged listing when nothing is closed) | Pass | `evidence/IMP-05-e2e-run-history.log` | `Test Files  4 passed (4)` / `Tests  23 passed (23)` |
| IMP-06 | `pnpm -C autobyteus-server-ts exec vitest run tests/architecture` plus the two renamed files | `9abe7086fd` (the handed-off commit; it differs from `9968ee0c73` only in those two test names) | same | the architecture suites, including the node access contract scan | NAS-41 | Pass | `evidence/IMP-06-architecture-after-fix.log` | `Test Files  15 passed (15)` / `Tests  98 passed (98)` |
| IMP-07 | `pnpm -C autobyteus-server-ts typecheck` | `a811f94348` (IR-002) | same | server `src` and `tests/` | all | Pass | `evidence/IMP-07-server-typecheck.log` | `[typecheck] production errors: 0; test-file errors: 1002 in 314 files (baseline 1002 in 314 files)`, `[typecheck] PASS` |
| IMP-08 | `pnpm -C autobyteus-server-ts exec vitest run` on `cross-run-message-delivery.test.ts`, `tests/unit/agent-communication`, `send-message-to.test.ts`, `tests/unit/remote-collaboration`, `agent-org-communication-presentation.test.ts`, `autobyteus-agent-run-backend-factory.test.ts` and `peer-run-state-notices.test.ts` (`--reporter=verbose`) | `a811f94348` | same | `admitPeerRun`, the router gate on every path, `deliverMessageToPeerRun`, the two-node continuations (agent through the endpoint and `node`, Team coordinator), and every IR-001 remote suite again | BEH-006 continuation; AC-007; REQ-002 (an owed "closed" replaced); AR-003 | Pass | `evidence/IMP-08-dn9-focused-tests.log` | `Test Files  36 passed (36)` / `Tests  283 passed (283)`; the test names start `autobyteus-591 DN-9` and `AC-007 (DN-9)` |
| IMP-09 | `pnpm -C autobyteus-server-ts test:unit` | `a811f94348` | same | the whole server unit, migration, architecture and journal suites | all | Pass | `evidence/IMP-09-unit-full.log` (excerpt; the full log is at `/tmp/r591/IMP-09-unit-full.log`) | `Test Files  1047 passed \| 5 skipped (1052)` / `Tests  8688 passed \| 9 skipped (8697)` |
| IMP-10 | `pnpm -C autobyteus-web typecheck` | `a811f94348` | same | the web app and the cross-package tests that compile server `src` | — | Pass | `evidence/IMP-10-web-typecheck.log` | `[typecheck] production errors: 0; test-file errors: 86 in 36 files (baseline 86 in 36 files)`, `[typecheck] PASS` |

- Not run, and why:
  - The two-server end-to-end (two real nodes, paired, over HTTP) for AC-001 … AC-007 is API/E2E's. The in-process two-node suites run the real peer client, gateway, handlers, roots, Team stack and stores; only HTTP and the agent runtimes are replaced.
  - The desktop and phone list's 5 s refresh was read in code, not observed on a running app (left to API/E2E).
  - `pnpm test:integration` was not run: no integration-folder code changed, and the cross-node cases are in the in-process suites above.

## Frontend Rendered-Result Check (When Applicable)

`Not Applicable`: no web code changed. The run list's rows come from the server's list (the filter is server-side), and the web's 5 s refresh is unchanged.

## Downstream Coverage Hints / Suggested Scenarios

- **AC-001 / AC-002 on two real nodes:** an agent, and a Team with a member mid-turn. After DONE/CANCELLED on A:
  - B's runs are offline at once;
  - B's `closed-delegations.json` names the run;
  - A's entry has no `peerNoticeOwed`;
  - A's log shows `TASK_PEER_NOTICE_CONFIRMED`.
- **AC-004:** stop B (or block it), close on A. A's entry shows `peerNoticeOwed: true` and logs `TASK_PEER_NOTICE_OWED` once. Restart A, start B: within 30 s of A seeing B, B's run stops and the mark is cleared. Also restart B while it is owed: the run resumes, then the retry stops it.
- **AC-005:** a third paired node sends the notice for B's run. It is refused with `REMOTE_TARGET_NOT_PERMITTED`, and the run keeps running.
- **AC-006:** B's desktop and phone run lists drop the row within about 5 s. On A, the run leaves the delegating run's tree (as locally, SR-010) and the Task page shows it offline.
- **AC-007 (SR-010):**
  - Reopen the Task on A; nothing changes on B.
  - The assigner's `send_message_to` to the run (agent run ID, or the Team's coordinator) is accepted: A's entry opens, B gets "open", lists the run again, and the run wakes with the message and its conversation.
  - Another sender gets `TASK_AGENT_RESOURCE_CLOSED`. `delegate_task` with the same Task gets the local refusal ("… then message the task agent's run id").
  - With B unreachable: the answer is `PEER_UNREACHABLE` with "send it again", and the run isn't stopped once B returns.
  - A different saved Task still works (RC-51 … 53).
- **Mixed versions:** B on an older build (no route). A keeps the notice owed and logs one line per run, not one every 30 s.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- The two-server E2E for AC-001 … AC-007 (TESTING.md's two-node surface), including restarts (AC-004) and the phone list (AC-006).
- **The gated two-server E2E pins the old behaviour.** `autobyteus-server-ts/tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts` (gate `RUN_AGY_FAILURE_E2E=1`, real Antigravity CLI) asserts what this ticket replaces:
  - RC-09 (`:1279`, lines 1292-1294): "a saved Task (task_id) can't be given to an agent on another node" for an existing remote run. A saved Task with no files is now accepted; with files it gets the attachments refusal.
  - RC-23 (`:2061`, lines 2074 and 2097-2098): the saved-Task refusal to a remote Team, the `TASK_AGENT_RESOURCE_FENCED_REMOTE` log records, and "the Team keeps running on beta". After DONE, beta now stops the Team, and alpha logs `TASK_PEER_NOTICE_CONFIRMED`.
  - The header comment (`:52`) and `:756` mention the fenced log, and RC-10 and RC-11 may assume the remote run keeps running after DONE.
  
  These are API/E2E's tests: I did not change or run them. The unit and in-process suites that pinned the old behaviour were updated in this change. (API/E2E updated that file in round 1, `52a1507b80`.)
- **IR-002:** rerun F-1 and F-2. The round 1 RC-51 and RC-53 steps that expect the assigner's message after a reopen to be refused, or `delegate_task` with the same Task to wake the run, now meet SR-010's AC-007 instead: the message continues the run, and that `delegate_task` gets the local refusal. RC-52's `rfOutcome` (a reopen alone while B is down) stays "stopped", as REQ-002 now says.
