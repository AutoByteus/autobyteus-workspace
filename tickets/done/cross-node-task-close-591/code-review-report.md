# Code Review Report: cross-node-task-close-591 (autobyteus-591)

The latest result is round 3, **CRR-005: Pass** (IR-003, the merge of base `6533d7be04`). It comes first, then round 2 (CRR-003), CRR-002 (the failure-origin review) and round 1 (CRR-001), with their finding IDs reused. The test review CRR-004 is in `api-e2e-test-review-report.md`.

## Round 3: Merge Review Of IR-003, The Base `6533d7be04` (CRR-005)

- **Scope:** `Targeted Delta Review` of the merge `037e6bec5c` (parents `0d13d37f86` and `6533d7be04`, which is `origin/personal`, v1.5.14-beta.6 with 583, 594, 15, 16 and 22; no rebase).
- **Remerge diff:** only the three conflict files plus `team-run-follows-definition.integration.test.ts`.
- **Conflicts: correct.**
  - `docs/design-cases.md`: the base's Case 25 (583) keeps its number, because done tickets cite it. This ticket's case becomes Case 26, and nothing outside it cites the old number.
  - `global-agent-run-message-router.test.ts`: 22's `ownsAgentRun` beside DN-9's `admitPeerRun` stub.
  - `remote-delegation-two-server.e2e.test.ts`: 22's new case kept before RC-23, with this ticket's RC-23 title.
- **Merge-induced fixes: correct.**
  - 22's integration test stubbed the removed `closedPeerRunRefusal`; it now stubs `admitPeerRun` returning `not_peer`.
  - DN-9's router test root implements `ownsAgentRun`.
- **Router semantics (read in the merged `deliver`): correct.**
  - `admitPeerRun` still runs first and once, before `node`, the sender-root branch and `route`.
  - 22 changed the sender-root branch from `hasAgentExecution` to `ownsAgentRun`. That is `hasAgentExecution` on standalone and Org roots, and adds only a Team root's former members (`root-team-run.ts:230`). So a root's peer endpoints still take that branch after admission, and DN-9's continuation through the endpoint is unchanged.
  - Former members are local runs, so `admitPeerRun` answers `not_peer`, and 22's "no longer a member" refusal is unchanged.
- **For API/E2E:** two cases in the two-server suite are now both named RC-51 (22's, and this ticket's AC-007 case). `record()` merges their receipts and `-t "RC-51 "` selects both, so one needs renumbering. That's API/E2E's call.
- **Checks:** I didn't rerun them; they ran on `037e6bec5c`. Server and web type gates pass; the full unit suite passes (8761); 22's integration test passes (3).
- **Findings:** none.
- **Routing:** `Pass`, to `/api_e2e_engineer`: the merged state, the two-server suite at least (with the RC-51 renaming). Then the test review, then delivery.

---

## Round 2: Review Of IR-002, The Assigner's Continuation Of A Closed Remote Run (CRR-003)

- **Scope:**
  - `Targeted Delta Review` of `dd5b230e7e..81a504de13`. The code is `a811f94348`: 4 source files (`cross-run-message-delivery.ts`, `global-agent-run-message-router.ts`, `peer-run-message-delivery.ts`, the composition), plus tests and docs.
  - Upstream: SR-010, SR-011 (DN-9); ARCH-REV-006 Pass.
- **The basis, rechecked against local code** (CRR-002's lesson). The local rule is `admit` (`cross-run-message-delivery.ts` `admit`):
  - a related or open run is delivered;
  - the last entry `assigned`, closed, and the sender its delegator: `assertReopenable` → restorability → `reopenAssignment` → delivered;
  - all closed and another sender: `TASK_AGENT_RESOURCE_CLOSED`.
  - DN-9 reads the same rule.
- **CR-591-001: Resolved.** `admitPeerRun({ agentRunId, senderAgentRunId })` (`:160-182`) applies that rule to a run whose Task entries here name a peer:
  1. **No peer entry:** `not_peer`, and the router continues as before.
  2. **Any open entry:** `admitted`.
  3. **The last entry `assigned`, closed, and the sender its delegator:**
     - `assertReopenable`, then `reopenAssignment`;
     - no local restorability check, which is correct (the run is its node's, CM-10);
     - then `peerNotices.changed` (B confirms "open" after any notice in flight, DN-1b);
     - `admitted` once confirmed.
  4. **Otherwise:** `TASK_AGENT_RESOURCE_CLOSED` with the local text. A Task-side rejection becomes the message's answer, through the shared `taskRefusal`.
- **One gate, ahead of every path (AR-003): correct.**
  - `GlobalAgentRunMessageRouter.deliver` calls it once, right after normalizing, before the sender root's exact endpoint (which holds peer runs open or closed and had no Task check), `node` and `route`. It runs outside any root's gate, so the network wait never holds one.
  - `closedPeerRunRefusal` and `route`'s peer branch are removed; no reference remains.
  - `deliverMessageToPeerRun` no longer checks the Task. Its only two callers have passed the gate (the router) or opened the entry and awaited "open" themselves (the re-delegation).
- **Deviation 7, `changed()` where DN-9 says `settled()`: Pass, the reason holds.** It is the one-call API accepted in CRR-001. The reopen changed the entry, so `changed()` marks the notice owed, waits for any notice in flight, then sends "open" read from `isOpen`.
- **Deviation 8, the refusal when B isn't reached: Pass.** It keeps the notice's code (`PEER_UNREACHABLE` and the like) and adds "… continues with its conversation (its Task is open again) but did not receive this message; send it again." That says what happened, why, and what to do (FR-1 … FR-3). The entry stays reopened, as locally after a delivery failure, and "open" stays owed.
- **The ordering note** (a second message while "open" is still in flight): Reject as a finding.
  - It is admitted because the entry is open, and could reach B before B's "open". B's S-5 then clears the record, and a "closed" Stop still running re-checks `stillClosed`.
  - The assigner's own sends are sequential (`send_message_to` returns after delivery). A concurrent second sender right after the reopen is technically possible but not a supported workflow. The handoff documents it.
- **CR-591-003: Resolved** (requirement text at SR-010). AC-001 and AC-006 now say what local behavior shows: offline by run ID, on the Task's page. No code change was needed.
- **CR-591-002: Resolved** (the Solution Designer aligned AC-004's alternate at `f39a92d5d3`: "If the run's entry is reopened before B is reachable … nothing is stopped. A Task's reopen alone doesn't prevent the stop"). The history of the open line:
  - REQ-002 now reads correctly: "never delivered for a run whose entry was reopened … A Task's reopen alone doesn't prevent it".
  - **AC-004's alternate still reads** "If the Task is reopened before B is reachable, nothing is stopped". That contradicts the corrected REQ-002 and the code (a reopen alone still delivers the close, RC-52 `rfOutcome`).
  - It needs "If the run's entry is reopened (the assigner's message or another Task) before B is reachable, nothing is stopped". That's for the Solution Designer.
  - No code change is needed, and API/E2E should test REQ-002's corrected rule.
- **The "fences" title:** fixed.
- **Checks:** I didn't rerun them; they ran on `a811f94348`.
  - Server and web type gates pass.
  - The focused remote suites: 283 tests.
  - The full server unit suite: 8688 passed.
  - New tests: six `admitPeerRun` cases; the router's order on the endpoint path and the `node` cases; the two-node continuations (agent through its root's endpoint, another sender refused, an owed "closed" replaced by "open", the `node` path, the Team coordinator).
- **Sizes:** the four source files grew modestly, and none is near 500.
- **Scorecard:** as round 1, with Runtime Correctness 9.4 (the continuation is now as local). Overall 9.4.
- **Findings:** none. CR-591-001 … -003 are resolved.
- **Routing:** `Pass`, to `/api_e2e_engineer`. Rerun F-1 and F-2 under SR-010: RC-51 and RC-53's continuation becomes the assigner's message; the same-Task `delegate_task` is refused as locally; REQ-002's reopen clause as corrected. The Implementation Engineer is informed.

---

## API/E2E Failure-Origin Review Of API-REV-001 (CRR-002)

- Entry point: `API/E2E Failure-Origin Review`. Code tested: `9abe7086fd` (head `dd5b230e7e`); API/E2E's commits are `52a1507b80` and `c6ac756d23`.
- **Failing:**
  - F-1 (AC-001's "A's child row shows it offline"; AC-006's "stays listed on A under its delegating run");
  - F-2 (AC-007; AC-004's reopen clause, which belongs to REQ-002): RC-51, RC-52 and RC-53.
- Evidence: `evidence/api-e2e/API-r1-runs.txt` §2 … §4, `API-r1-rc-receipt.json` and `API-r1-rc52-receipt.json`.
- **Everything else passes on two real built nodes:**
  - AC-001's stop (0.3 s);
  - AC-002's Team mid-turn;
  - AC-003;
  - AC-004's retries after either restart (delivered 28 s after B returns), and an older B answering 404;
  - AC-005;
  - AC-006 on B, desktop and phone (MSP-93).

### F-2: the requirements have local continuation backwards (CR-591-001, Requirement Gap)

- **Local behavior, read in the code:**
  - **A reopened Task is continued by its assigner's message.** `CrossRunMessageDelivery.admit` (`cross-run-message-delivery.ts:211-219`) takes a message to a run whose last entry is closed and was assigned by the sender: it checks `assertReopenable` and that the run can be restored, then calls `reopenAssignment`. `project-change-feed.e2e` AC-023 pins this ("… continues with its conversation").
  - **`delegate_task` with the same Task is refused,** and the refusal tells the agent to do exactly that (`task-execution-resources.ts:208-210`): "This task agent already has Task …. To continue it, set Task … to TODO or IN_PROGRESS, then message the task agent's run id."
  - `delegate_task(run, task_id)` reopens or appends only for a **different** saved Task, which works for remote runs now (RC-51, RC-52, MSP-93).
- **What the approved basis says instead** (`requirements-doc.md` REQ-005 / REQ-006, DEC-004's "Locally (read at SR-005)", AC-007; design DN-1 / DN-8): "a reopen … a message to it is refused (`TASK_AGENT_RESOURCE_CLOSED`) … When its assigner gives it the Task again (`delegate_task` with the run's ID and `task_id`, `reopenAssignment`), the entry reopens."
  - That holds only when the message comes from someone other than the last assigner. For the assigner, the message is the continuation and `delegate_task` is refused.
- **For a remote run,** `closedPeerRunRefusal` (`cross-run-message-delivery.ts:142-148`) refuses any message to a peer run whose entries are all closed, with no continuation step. So the PM's case, reopening the Task and continuing the same run, is still a dead end on both paths (RC-51 for an agent, RC-53 for a team). That is the dead end REQ-006 set out to remove, and it differs from local behavior, which DEC-004 and the user ("the behavior … should be similar") require.
- **Origin:** the requirements and design, not the implementation. The code does what DN-8 and AC-007 say; their premise about local behavior is wrong. A remote counterpart of `admit`'s continuation (the assigner's message reopens the entry, then "open" is confirmed, then the message is delivered through DN-1b's order) is a design decision. So is how AC-007's wording changes. **Classification: `Requirement Gap`,** with the Solution Designer.
- **My own gap:** in CRR-001 I accepted DN-8 and AC-007's statement of local behavior without reading `admit`'s continuation. Principle 1 asks to check "as locally" rule by rule against the code. I'll check such parity claims against the local code from now on.

### F-2 (b): REQ-002's reopen clause contradicts SR-005 (CR-591-002, Requirement Gap)

- REQ-002 / AC-004's alternate say an owed close "is never delivered for a run whose Task was reopened … before delivery".
- SR-005 and DN-1 decided that a reopen alone changes no entry, so `isOpen` stays false and the owed "closed" is delivered and the run stopped (RC-52 `rfOutcome`). The implementation follows DN-1. Only a re-delegation, or another open Task, turns it into "open" (proven).
- The requirement and the design disagree. Under the corrected local rule (F-2), a reopen alone is still not a continuation, so REQ-002's text most likely needs "its entry reopened" in place of "its Task reopened". That is the Solution Designer's to settle with CR-591-001.

### F-1: AC-001 and AC-006 ask for a tree row that local behavior removes (CR-591-003, Requirement Gap)

- `RunTreeView` builds a run's **open** subtree (`run-tree-view.ts:104-109`, unchanged by this ticket). A run whose Task closed leaves its delegator's tree locally too: `task-reactivation-root-visibility.e2e.test.ts:315-317` pins "A closed Task's run leaves the tree (its row removed)".
- On A, after the close, the Task page still names the run (`root.closed: true`), and its status reads `offline` by run ID. Both meet REQ-004 / AC-001's intent.
- AC-001's "A's child row shows it offline" and AC-006's "stays listed on A under its delegating run" ask for a row that the local rule, which DEC-004 adopts, removes.
- **Origin: the requirement text, not the code. `Requirement Gap`.** The AC likely needs to read "its status by run ID reads offline, and it stays on the Task's page" (the local behavior). Keeping a tree row for closed remote runs only would be a new rule the user hasn't asked for.

### Smaller items

- **Implementation, test-side:** `team-remote-delegation.test.ts`'s title "closing the Task on A fences the remote Team (fenced_remote)" still says "fences". It's a stale name to fix in the next implementation round.
- **API/E2E's RC-49 update** (not in the handoff's list): correct. The closed run is now stopped, so the other nodes' agents get the not-running refusal. It'll be reviewed with the round's test changes.
- **FU-591-01** (the contract fixture lacks 565's `counterpart`, same on base `7591aa307f`): a follow-up, as recorded.

### Classification and routing

- CR-591-001, -002 and -003: `Requirement Gap`, to `/solution_designer`.
- The implementation stands as reviewed (CRR-001) for everything the corrected requirements keep.
- The revised package (likely a remote counterpart of the assigner's message continuation, and the corrected AC-001 / AC-006 / AC-007 / REQ-002 text) then goes through implementation, this review, and API/E2E again.

---

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Context read:
  - `requirements-doc.md` (Approved, SR-005), REQ-001 … REQ-006 and AC-001 … AC-007;
  - `design-spec.md` (SR-009), DN-1 … DN-8 and S-1 … S-6;
  - `solution-revision-record.md` (SR-001 … SR-009);
  - `design-review-report.md` and `architecture-review-revision-record.md` (ARCH-REV-003, ARCH-REV-004 Pass; uncommitted, the reviewer's);
  - `implementation-handoff.md` and `implementation-revision-record.md` (IR-001);
  - `investigation-notes.md`.
- Code Review Revision Record: `code-review-revision-record.md`. Current Code Review Revision ID: `CRR-001`. Round 1.
- Review Scope: `Full Review` of `fa63874115..dd5b230e7e` (`77ca417ac3`, `9968ee0c73`, `9abe7086fd`, `dd5b230e7e`): 56 files, +1479 / −121.

## Routing Classification Review

- `Medium` / `High`, confirmed: a new cross-node contract, a persisted field on each side, a stop across nodes, a retry loop.
- Route: `Implementation Review`. Independent review required: `Yes`.

## Upstream Behavior And Production-Path Basis Confirmation

- Behavior-basis status: `Confirmed`.

| Behavior | Status | Implementation path and evidence |
| --- | --- | --- |
| BEH-001 (REQ-001; AC-001 … 003) | Confirmed | `TaskExecutionResourceRelease.stop` hands each released peer run to `noticePeerRun` without blocking the closure. The `FENCED_REMOTE` branch is gone, and no `FENCED_REMOTE` remains in `src`. `PeerRunStateNotices.changed` → `isOpen` at send time → `deliveredRunState` → B's `DelegatedRunStateHandler.apply` records the run, then calls `stopForTaskClosure`. A run with another open Task isn't in `releasable()`, so nothing is sent (AC-003). |
| BEH-002 (REQ-002; AC-004) | Confirmed | `peerNoticeOwed` is set on the current entry and cleared from all of the run's entries. A 30 s unref'd timer runs per peer only while that peer has owed notices. `start()` reads `owedPeerNotices()` from the entries `composeTaskSide` already loaded (QR-002), and runs after `remote.bind` (`build-studio-server.ts:320-322`). |
| BEH-003 (REQ-003; AC-005) | Confirmed | `PeerGateway.deliveredRunState` → `admit` (pairing, signature, node) → the handler's `storedLinkCheck(run, {kind: "owner", fromNodeId, targetAgentRunId: null})`. The route falls under the `/rest/remote` PEER rule (`node-route-permissions.ts:86`) and is documented as NAS-41. |
| BEH-004 (REQ-005; AC-006) | Confirmed | `WorkspaceRunHistoryService.listed` = `topLevel` and `!closedDelegations.has(run)`, checked in memory for both list reads. The live signal is the existing 5 s re-read (deviation 3). |
| BEH-005 (REQ-004) | Confirmed | The Stop paths are unchanged and nothing is deleted. S-5 clears the record after an accepted linked message or work packet from the delegating node. |
| BEH-006 (REQ-006; AC-007) | Confirmed | In `toExistingRun`, the `:370` refusal is removed. Files are refused for a peer run before anything changes. The conversation check is skipped for a peer run. `assignExistingTaskExecution` keeps `nodeId` / `members`. `toPeerRunAgain` calls `changed()` (after any notice in flight) and delivers only on `confirmed`, through `deliverMessageToPeerRun`. A failed delivery leaves the entry open (`markFailed` keeps `closedAt: null`), so the "open" notice stays owed, which is consistent. |

## Supported Product Scenario And Reachability Gate

| Scenario | Validity | Use |
| --- | --- | --- |
| SCN-001: close a Task whose run is on a peer | Supported Normal | Use |
| SCN-002: the peer unreachable at the close, or either node restarted | Supported Explicit Edge | Use |
| SCN-003: a third node sends the notice | Supported Normal (CM-12) | Use |
| SCN-004: B's run list | Supported Normal (DEC-004) | Use |
| SCN-005: reopen, then give the Task again to the remote run | Supported Normal | Use |

### Candidate Finding And Mechanism Gate

| ID | Observation | Disposition | Reason |
| --- | --- | --- | --- |
| C-1 | **A change in flight:** a re-delegation that commits while "closed" is in flight. `send` re-reads `isOpen` after the answer and again after the clear, re-marks the notice owed and sends again in the same turn (`peer-run-state-notices.ts:97-104`). A queued turn finding nothing owed returns confirmed, which is correct, because the previous turn confirmed the current state. | Reject (correct) | Traced: B ends on the current state, and the work is delivered only after "open" is confirmed (DN-1b). |
| C-2 | **A stale owed mark on file:** a clear by turn T1 can land after a concurrent `changed()` wrote `true`. Memory then holds nothing owed, while the file keeps `peerNoticeOwed: true`. | Reject | Stated in the handoff. The only effect is one idempotent resend after a restart, and a real state change in that window is re-checked. |
| C-3 | **An old write failure:** `ClosedDelegations.close` returns `this.writes` when the run is already recorded, so a later notice could reject because of an earlier unrelated write that failed. | Reject | It needs a disk write failure, an infrastructure failure outside scope by default. A then keeps the notice owed, which is safe. |
| C-4 | **A peer that never comes back:** its owed notices are retried every 30 s indefinitely (one request per owed run; one log line per new reason). | Reject | DEC-002 (b) decides this; the cost is bounded and logged once. |
| C-5 | **The stop/message race on B:** S-5 clears the record after the message is accepted, so a "closed" Stop running at the same time could stop a newly woken run. | Reject | Not reachable: A refuses messages to closed entries (`TASK_AGENT_RESOURCE_CLOSED`), and a re-delegation's work goes out only after B confirmed "open", which comes after any "closed" Stop has finished. A message from another node doesn't clear the record (`openedBy`). |

## Deviations From The Design Text (handoff § Known Risks)

| # | Deviation | Verdict |
| --- | --- | --- |
| 1 | B stops with `stopForTaskClosure(runId, stillClosed)`, not the owner `terminate` | **Pass, the reason holds.** The owner path answers "not stopped" for an inactive Team, which would keep the notice owed forever. `stillClosed = closed.has(run)` is B's counterpart of `kept_open`, and a `kept_open` answers `open: true`. It is the same ordinary Stop the closure uses locally (CM-7). |
| 2 | Each `ClosedDelegations` entry also stores the delegating `nodeId` | **Pass.** `openedBy` limits S-5 to the delegating node; a node this run delegated to says nothing about A's Tasks. An entry without a node falls back to "any". The reader stays tolerant and the writer exact. |
| 3 | No run-list publisher | **Pass.** DN-6 left the signal "to verify". The 5 s `ListWorkspaceRunHistory` re-read on desktop and phone (`RUN_HISTORY_REFRESH_INTERVAL_MS`) is the signal a local closure uses too. API/E2E observes it (AC-006). |
| 4 | One `changed()` call instead of a separate `settled` | **Pass.** It removes an unused second entry point; the re-delegation awaits `changed()`'s outcome. |
| 5 | No peer-directory dependency | **Pass.** `PeerClient.call` already refuses `PEER_NOT_REGISTERED` when `findByNodeId` is null, and that code is in `DROPPED`. A second lookup would add nothing. |
| 6 | `PEER_NOT_PAIRED` keeps the notice owed | **Pass.** DN-4's drop is for a node that is no longer a peer (not registered). A peer to pair again can still be told, and the retry cost is bounded. |

## Structural / Design Checks

| Check | Result | Evidence |
| --- | --- | --- |
| Design health preserved | Pass | A missing behavior, filled by one owner on each side plus one link request |
| Matches approved supplements | Pass | DN-1 … DN-8, with the 6 deviations above |
| Spine clarity | Pass | S-1 … S-6 traced, as above |
| Ownership | Pass | A: `PeerRunStateNotices` alone decides and orders notices; the Task side (`TaskExecutionResourceService`) owns the entries and the mark. B: `DelegatedRunStateHandler` owns the state; `ClosedDelegations` owns the record. |
| Off-spine and reuse | Pass | Reuses `admit`, `storedLinkCheck`, `stopForTaskClosure`, `atomicWriteJsonFile` and the extracted `deliverMessageToPeerRun` (the router has the same order and results, and its tests are unchanged) |
| Structure tightness | Pass | `peerNoticeOwed?: true` exists only on peer runs and is written only when true. `ClosedDelegationEntry` is its own type. |
| Empty indirection | Pass | The port types (`PeerRunStateNotice`, `PeerNoticeTaskSide`) are narrowed views of the real owners |
| Dependencies (P16) | Pass | Everything is passed from the composition: the notices get `input.remoteChannel` and the Task side; B's handler gets the services. The application host passes "none" values (`() => null`, `NO_CLOSED_DELEGATIONS`). No process-wide lookup was added. |
| Interface clarity | Pass | `{run: {kind, runId}, open}` with explicit kinds; answers `accepted/open`, `not_found` and `not_linked` |
| Naming | Pass | Domain words added to the glossary (delegation state, closed delegation, owed notice) |
| Dead code | Pass | `FENCED_REMOTE` and the `:370` refusal are removed. `REMOTE_ROOT_REFUSAL_TEXT.savedTask` stays, still used by `RemoteDelegation`. |
| Tests | Pass | Unit tests for the notices (ordering, in-flight change, owed, retry, drop), the record and handler, the owed mark (domain, schema, service), the gateway, S-5 and the list. The two-node in-process suites cover AC-001 … 005 and AC-007, agent and team. |
| API/E2E readiness | Pass | The gated two-server E2E pins the old behavior (RC-09, RC-23 and the header and `:756` mentions); it's listed for API/E2E |

## Source File Size Audit

| File | Before | After | >500 |
| --- | --- | --- | --- |
| `task-delegation.ts` | 442 | 464 | Pass |
| `project-task-service.ts` | 470 | 472 | Pass |
| `build-studio-server.ts` | 439 | 447 | Pass |
| `peer-client.ts` | 429 | 437 | Pass |
| New files (notices 172, record 104, handler 53, delivery ~40 lines) | — | — | Pass |

## Legacy / Persisted Data

- No compatibility mechanism and no legacy retention.
- **A:** `peerNoticeOwed` is a compatible optional field. The current reader rejects it only when it isn't `true` or isn't on a peer run (the writer never writes that). An older reader ignores it.
- **B:** `closed-delegations.json` is a new file. Absence means open, and the reader is tolerant. A rollback lists the runs again, which is harmless.
- No migration (`Directly Usable`), as decided.

## Docs-Impact Verdict

- `Yes`, and done: `collaboration_model.md` (CM-7, CM-10, §3, §4, §5), `GLOSSARY.md`, `node_access_model.md` (NAS-41), `remote_collaboration.md`, and the stale text in `projects.md`, `agent_communication.md` and `agent_team_execution.md`.

## Review Scorecard

- Overall: **9.4 / 10**.

| # | Category | Score | Why |
| --- | --- | --- | --- |
| 1 | Data-Flow Spine | 9.5 | S-1 … S-6 trace cleanly; one owner per side |
| 2 | Ownership & Boundaries | 9.5 | A orders and decides, and B applies; entries stay with the Task side |
| 3 | API / Interface | 9.4 | One request with an explicit run kind and boolean state; three clear answers |
| 4 | SoC & File Placement | 9.4 | Four small new files in their subsystems |
| 5 | Shared Structures | 9.4 | Peer-only optional field; its own record type |
| 6 | Naming | 9.4 | Glossary terms added |
| 7 | API/E2E Readiness | 9.3 | The in-process two-node suites cover the ACs. The gated two-server E2E needs updates for RC-09 and RC-23, and the 5 s list refresh is read in code only. |
| 8 | Runtime Correctness | 9.4 | In-flight changes, re-delegation order and `kept_open` on B traced; the stale mark is harmless |
| 9 | No Legacy | 9.5 | Clean removal of the skip and the refusal |
| 10 | Cleanup | 9.4 | — |

## Findings

None.

## Follow-ups

None added.

## Recommended Recipient

`/api_e2e_engineer`. The Implementation Engineer is informed.

## Residual Risks (for API/E2E)

- The two-server E2E for AC-001 … AC-007 on real nodes, including restarts (AC-004) and the desktop and phone list (AC-006).
- Update the pinned tests: RC-09, RC-23, the header (`:52`), `:756`, and possibly RC-10 and RC-11.
- A remote team's Stop with real runtimes, a member mid-turn (AC-002).
- Mixed versions: an older B answers 404 → `PEER_UNREACHABLE`, so the notice stays owed and is logged once.

## Latest Authoritative Result

- Review Decision: **Pass**
- Scenario Gate: Pass. Material-Premise Gate: Pass.
- Score: 9.4 overall; every category ≥ 9.3.
- Recipient: `/api_e2e_engineer`
