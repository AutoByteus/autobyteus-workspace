# Design Review Report: cross-node-task-close-591

## Review Round Meta

- Upstream Requirements Doc: `requirements-doc.md` (approved at SR-005; DEC-004 by the user)
- Upstream Investigation Notes: `investigation-notes.md` (F-1 … F-8, U-1 … U-3)
- Upstream Solution Revision Record: `solution-revision-record.md` (SR-001 … SR-006)
- Reviewed Design Spec: `design-spec.md` at SR-011 (commit `d521a755cb`); earlier rounds reviewed SR-006 … SR-010
- Supplemental Task Artifacts Reviewed: `handoff-architecture-review-sr006.md`
- Relevant Solution Revision IDs: SR-004 … SR-006
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-006`
- Current Review Round: 6
- Trigger: the Solution Designer's handoff of SR-006
- Prior Review Round Reviewed: 1 (ARCH-REV-001, `Fail`, AR-001)
- Latest Authoritative Round: 6
- Current-State Evidence Basis: the branch at `39973b9e1a` (base `origin/personal` `7591aa307f`). These were opened at their lines:
  - `task-delegation.ts:360-410` (`toExistingRun`: the `:370` remote refusal, the tree check `:374-375`, `assertAssignable`, `deliverToRun`);
  - `agent-run-metadata-store.ts:40-64, 135` (the parser and writer of `run_metadata.json`);
  - `remote-message-receiver.ts:104-135` (inbound `work_packet` and `message`);
  - `remote-run-links.ts:137-157` (`admitsWorkPacket`, `admitsOwner`, `admitsInbound`);
  - `root-team-run.ts:317-318` (`acceptRemoteWorkPacket`).

## Round 6: SR-011, one gate for every peer message (AR-003 answered)

- **Change reviewed** (commit `d521a755cb`; DN-9, S-4b, tests):
  - `GlobalAgentRunMessageRouter.deliver` calls `crossRun.admitPeerRun({ agentRunId, senderAgentRunId })` once, after normalizing and before the `node` branch, the sender-root branch (`deliverExactAgentMessage`) and `route`. It runs outside any root's gate.
  - A target with no peer entry on A answers `not_peer` and the router continues. Otherwise rules 1 to 3 apply.
  - `closedPeerRunRefusal` and `route`'s peer branch are removed. `deliverMessageToPeerRun` no longer checks the Task, because its callers passed the gate (the router) or opened and settled the entry themselves (DN-8).
  - Tests: the assigner's run-ID message through the root's endpoint; another sender refused; an owed "closed" not stopping the run afterwards; the same through `node`.
- **AR-003: resolved.**
  - Every agent message from A to a peer run enters through the router, and the gate is the router's first step after normalizing. So the sender-root endpoint path, `route` and `node` all pass it exactly once.
  - The `settled` wait sits outside any root's operation gate.
  - With one owner of the check and no second check, the closed-Task rule can't drift between paths.
  - Owner commands through the link are unchanged, as preserved (CM-11).
- **Decision (round 6):** `Pass`. The package (SR-011) is ready for implementation.

## Round 5: SR-010, local continuation read correctly (DN-9; CRR-002)

- **Change reviewed** (commit `e689ab1009`).
  - **Requirements:** REQ-006, DEC-007, AC-007 and SCN-005 now follow the local rule: the assigner's message after a reopen continues the run, and `delegate_task` with the same closed Task gets the local refusal. REQ-002 says a reopen alone doesn't cancel an owed close. REQ-004, AC-001 and AC-006 say a closed remote run leaves A's tree.
  - **Design DN-9:** `CrossRunMessageDelivery.admitPeerRun` replaces `closedPeerRunRefusal` "in both callers", `route` `:109` and `deliverMessageToPeerRun` (`peer-run-message-delivery.ts:29`). Its rules:
    - some entry open: admitted;
    - the last entry assigned and closed, and the sender its delegator: `assertReopenable`, no local restorability check, `reopenAssignment`, `await notices.settled(run)`, admitted;
    - otherwise `TASK_AGENT_RESOURCE_CLOSED`;
    - `settled` unreachable: `PEER_UNREACHABLE`, with "open" left owed.
- **Requirements: consistent with the direction.** The local rule read (`cross-run-message-delivery.ts:202-219`) matches DEC-004's "as local" and the user's words at SR-003 ("you delegate again or you send a message again"). The correction stays within the direction; the user was informed.
- **DN-9's rules: sound.** They are the local continuation's rules on the same owner, with B owning restorability (CM-10), and they sit inside DN-1b's sequence.
- **Not sound as written (AR-003, Design Impact; REQ-006 / AC-007, REQ-002): DN-9 misses the path the assigner's run-ID message actually takes.**
  1. The router's run-ID path asks the sender's root first: `senderRoot.hasAgentExecution(target)` → `deliverExactAgentMessage` (`global-agent-run-message-router.ts:88-103`). It reaches `crossRun.route` only when the sender's root doesn't hold the target.
  2. The delegator's root holds its peer runs as endpoints, *open or closed*:
     - `RemoteRunLinks.has` → `endpointFor` over `peerRunLinksOf` (`remote-run-links.ts:100-128`);
     - `DelegationIndex.peerChildrenOf` lists "open or closed" (`delegation-index.ts:295-311`).
  3. Each root's exact send to that endpoint goes straight to `remoteSend.send`, with no closed-Task check:
     - `standalone-root-message-delivery.ts` `deliverExact`;
     - `team-run-message-delivery.ts:68-73`;
     - `agent-org-run-message-delivery.ts:63-68`.
  - **So the assigner's `send_message_to(run ID)` to its closed remote run never meets `admitPeerRun`:**
    - A's entry isn't reopened, and A's tree keeps it closed. That is against the local rule (REQ-006).
    - B wakes the run on the message (S-5 clears its mark).
    - If a "closed" notice is still owed, A's next retry computes `isOpen` = false and stops the run B just woke (REQ-002 / AC-004).
  - DN-9's two callers cover only `node` sends and run IDs held by no root.
  - **Needed:** every path that sends A's agent message to a peer run passes `admitPeerRun` once: run ID through the sender root's endpoint, run ID through `route`, and `node`.
    - The natural single place is one gate before the root's peer send. That is either the router before `deliverExactAgentMessage` when the target is a peer endpoint of the sender's root, or a passed-in port in `RemoteMessageSend` (`send` and `sendToPeerRun`) with `deliverMessageToPeerRun`'s own call removed.
    - Keep `settled(run)`'s network wait outside the root's operation gate: `deliverExactAgentMessage` runs inside it, so prefer the router-side check.
    - Tests: the assigner's run-ID message to a closed remote run reopens A's entry, sends "open" and delivers; another sender's is refused; with a "closed" notice still owed, the run isn't stopped after the message.
- **Decision (round 5):** `Fail` (AR-003, Design Impact). The requirement corrections and DN-9's rules need no change.

## Round 4: SR-009, B's closed delegations as one node record (DN-5, DN-6)

- **Change reviewed** (commit `ccb3ed40ef`; the Implementation Engineer's Design Impact on DN-6):
  - B's record of a peer-closed delegation is `<appDataDir>/remote-collaboration/closed-delegations.json`, owned by `ClosedDelegations`. It loads once, writes atomically, and has a tolerant reader; absence means open.
  - The listing filters in memory with `has(run)`. The state handler and the inbound clear (S-5) write it.
  - The run-file field `delegationClosedAt` is withdrawn.
  - Rejected: an index-row flag (a rollback would wipe the index) and per-row file reads (about 1,070 at first paint).
- **Verified:**
  - **The listing reads index rows.** `listWorkspaceRunHistory` reads index rows through the `topLevel` predicate (`workspace-run-history-service.ts:79-96`), the natural filter point.
  - **The index readers are strict.** `agent-run-history-index-store.ts:15-25` sets the allowed row keys, and `:76-77` returns `null` for the whole index on any unknown key. So an index-row flag would make an older build treat the index as unreadable, against guideline §3's rollback safety. Rejecting it is right.
- **Judgement: sound.**
  - **One owner, one small record,** read once, so there are no per-row reads (DESIGN.md rule 3).
  - **Compatible.** A rollback ignores the file, and the rows reappear harmlessly.
  - **The filter sits at the existing `topLevel` predicate,** so desktop and phone, which share the listing query, drop the row together.
  - **Withdrawing the run-file field** removes round 1's note 1 as moot.
- **Notes (not blocking):**
  1. When B deletes a run, remove its entry from `ClosedDelegations`, so the record never holds dead IDs. It is small either way.
  2. DN-6's live signal, so an open list drops or restores the row within the update time, stays with the implementation, as before.
- **Decision (round 4):** `Pass`. The package (SR-009) is ready for implementation.

## Round 3: SR-008 (AR-002 answered)

- **Change reviewed** (commit `ed9c473b3a`; DN-8, S-4, scope):
  - for a run with a `nodeId` entry, `toExistingRun` skips the local conversation check (B owns restorability, CM-10);
  - it chooses the delivery: `deliverToRun` for a local run, a second passed-in port `deliverToPeerRun` for a remote run (`TASK_ASSIGNMENT_MESSAGE_TYPE`, the entry's `nodeId`), after `notices.settled(run)`;
  - the port is the router's existing peer core, extracted once as `deliverMessageToPeerRun` (context, channel, `closedPeerRunRefusal`, the sender root, `senderRoot.deliverToPeerRun`) and called by both the router and the composition;
  - a refusal from B or an unreachable peer gives `TASK_WORK_NOT_DELIVERED`;
  - a two-node AC-007 test covers an agent and a team coordinator.
- **AR-002: resolved.**
  - The work now leaves A through the same peer delivery `send_message_to(node)` uses: one function, two callers, no copy.
  - It is sent inside DN-1b's per-run sequence, so AR-001's ordering holds.
  - Skipping A's conversation check is correct, because the run's conversation and restorability are B's, and B's delivery answer is the real check.
  - `closedPeerRunRefusal` passes, because the entry was just opened. On B, the linked message is admitted by the back-link endpoints and wakes the run (S-5).
- **Decision (round 3):** `Pass`. The package (SR-008) is ready for implementation.

## Round 2: SR-007 (AR-001 answered; notes 1 and 2)

- **Change reviewed** (commit `bc2cccfd8c`; DN-1b, DN-5, DN-8, S-4 and the walks):
  - **DN-1b:** one ordered sequence per remote run. At most one notice is in flight, the state is computed at send time, and the next notice goes after the previous answer.
  - **DN-8's work:** `toExistingRun` awaits `notices.settled(run)`, meaning the latest confirmed state is "open", before delivering. An undeliverable notice fails the delivery as `TASK_WORK_NOT_DELIVERED`, with "open" left owed.
  - **On B:** the handler answers `open:false` after its Stop completes, and a time-out on A keeps the notice owed.
  - **Note 1:** `delegationClosedAt` is a typed field with round-trip tests.
  - **Note 2:** the work goes through the local `deliverToRun` → `crossRun.route`. Whether `route` and the conversation check hold for a remote target is marked "to verify".
- **AR-001: resolved.** A's per-run sequence gives the cross-node counterpart of `kept_open`. A stale "closed" can no longer reach B after the re-delegated work, because the work waits for a confirmed "open", and "confirmed closed" now means "stopped". The tests named cover both in-flight cases.
- **Note 1: resolved** (typed field, parser and writer, round-trip tests).
- **Note 2's "to verify", answered by reading the code. Both premises fail (AR-002, Design Impact, REQ-006 / AC-007):**
  1. **The conversation check refuses a remote run.** `toExistingRun` refuses unless `conversationOf(execution, …)` answers `present` (`task-delegation.ts:381-385`). `createRunConversationAvailability` (`run-conversation-availability.ts:26-36`) answers "present" only for a live run on this node; otherwise it inspects this node's memory, `agents/{id}` or the team's saved tree. A remote run's conversation lives on B, so on A the check answers missing or indeterminate, and every remote re-delegation is refused. Note that `delegated-run-restorability.ts:44-47` already says "a peer's run is not this node's to restore".
  2. **`crossRun.route` doesn't deliver to a peer run.** For a run with an open peer entry, `route` returns `null` (`cross-run-message-delivery.ts:105-109`, then `closedPeerRunRefusal` → `null` when an entry is open). That means "reached through the sender root's peer endpoints (CM-11)". `toExistingRun` takes `null` as a failed delivery (`:398-404`), so the work never leaves A.
  - **The existing peer delivery** is the call `send_message_to(node)` makes: `senderRoot.deliverToPeerRun({ sender, nodeId, targetAgentRunId, content, messageType, referenceFiles })` (`global-agent-run-message-router.ts:188-205`). On B it is a linked message, admitted by the back-link endpoints (CM-11).
  - **Needed:**
    - For a run with a `nodeId` entry, skip the local conversation check (B owns the run's restorability, CM-10; B's answer to the delivery stands).
    - Deliver the `TASK_ASSIGNMENT` work through the sender root's `deliverToPeerRun` with the entry's `nodeId`, inside DN-1b's sequence, after `settled(run)`.
    - Name the owner that chooses between the local and the peer delivery (for example `TaskDelegation`, through one passed-in delivery port with a local and a peer branch).
    - B's refusal (for example the run deleted) gives `TASK_WORK_NOT_DELIVERED`, as today.
    - Add an AC-007 integration test with two nodes: the work reaches B's run and wakes it.
- **Decision (round 2):** `Fail` (AR-002, Design Impact). DN-1b, DN-2 … DN-7 and note 1 need no change.

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `High`
- Classification rationale reviewed: a new cross-node contract (a link request and handler), a new persisted optional field on each side, lifecycle (Stop) across nodes, a retry loop, and DN-8's remote re-delegation.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: none.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements and intended behavior understood: REQ-001 … REQ-006 and AC-001 … AC-007. DEC-004 (the user): a closed remote run leaves the peer's list, as locally. DEC-007: re-delegation to an existing remote run. The preserved boundary is BEH-001's local closure including CR-461-001's `kept_open`, BEH-003 and BEH-005.
- Relevant existing behavior and evidence confirmed:
  - F-1's skip, F-4's link `terminate` and the back-link check were read by the designer and are consistent with what I opened.
  - `toExistingRun` refuses any run with a `nodeId` entry (`task-delegation.ts:370`).
- Scope guardrail confirmed: 380's temp-Task rules, file transfer (587) and the peer-grouped list are out of scope.
- Every prospective blocking `Design Impact` finding is traceable: `Yes` (AR-001 → REQ-006 / AC-007, REQ-002, and BEH-001's preserved `kept_open` intent).
- Statements about existing code the design relies on (Principle 1):
  - **U-1 holds.** `toExistingRun` refuses a run outside the sender's tree before any Task check (`task-delegation.ts:374-375`, `notADelegatedRunOfThisRun`). B's own agents never delegated a peer-started run, so they can't give it a Task. Only A's entries name it, which supports DEC-003. The design's test still pins it.
  - **DN-5's premise is incomplete.** "Both readers tolerate unknown keys" is true of `run_metadata.json`, but the reader tolerates by *dropping*. `parse…` (`agent-run-metadata-store.ts:40-64`) builds the result from known fields only, and `writeMetadata` (`:135`) writes that object. An unknown `delegationClosedAt` would therefore be lost on the next rewrite of the file. See note 1.
  - **DN-8's work packet** is admitted only when its sender is the back-link's delegator endpoint (`remote-run-links.ts:137-140`). `acceptRemoteWorkPacket` treats the packet as the run's first message, recording a title (`remote-message-receiver.ts:111-127`). See note 2.

| Behavior ID | Alignment | Trigger / Evidence | Path / Spine | Status | Required Action |
| --- | --- | --- | --- | --- | --- |
| BEH-001 (REQ-001) | Pass | Pass | Fail: an in-flight closure can stop a run re-delegated meanwhile (AR-001) | Needs Correction | AR-001 |
| BEH-002 (REQ-002) | Pass | Pass | Pass (owed per run; 30 s per-peer timer; survives restarts) | Confirmed | — |
| BEH-003 (REQ-003) | Pass | Pass | Pass (`admit` and the stored link check) | Confirmed | — |
| BEH-004 (REQ-005) | Pass | Pass | Pass (signal to verify, DN-6) | Confirmed | Note 1 |
| BEH-005 (REQ-004) | Pass | Pass | Pass | Confirmed | — |
| BEH-006 (REQ-006) | Pass | Pass | Fail: ordering against the closed notice (AR-001) | Needs Correction | AR-001, note 2 |

## Task Design Health Assessment Verdict

`Pass`. The root cause is read and confirmed in the founder's log (F-1, F-2). The refactor posture is explicit: replace the skip with an owner and a link request.

## Spine Inventory Verdict

| Spine | Verdict | Notes |
| --- | --- | --- |
| S-1 close | Fail | Missing per-run ordering against S-4 (AR-001) |
| S-2 unreachable, S-3 A restart | Pass | — |
| S-4 re-delegation | Fail | The work delivery isn't ordered after the run's state notices (AR-001) |
| S-5 wake, S-6 refused | Pass | — |

## Boundary / Dependency / Interface Verdicts

- **Boundary:** `Pass`.
  - `PeerRunStateNotices` is the one owner on A of a remote run's delegation state, and B's handler is the one owner on B.
  - B stops through the run's ordinary Stop, as the link's `terminate` does.
- **Dependency:** `Pass`. The collaborators are passed from the composition, and the application host passes "no remote" (autobyteus-500 DR-1).
- **Interface:** `Pass`. `POST /rest/remote/delegated-run-states { run, open }`, behind `admit` and the owner link check, with answers `accepted`, `not_found` and `not_linked`.
- **Empty indirection:** `Pass`. Both new owners have real rules.

## Shared Structure / Data Model Verdict

`Pass`, with note 1.
- `peerNoticeOwed` on A's Task entry (the Task reader tolerates and the writer emits only when set) and `delegationClosedAt` on B's own file are compatible optional fields (guideline §3).
- One meaning each.

## Persisted Data Verdict

`Pass`, with note 1. Neither field needs a migration: absence means "nothing owed" or "open". There is no sweep of old closures (DEC-005), and rollback is harmless.

## Review Decision

`Pass` (round 6). AR-001, AR-002 and AR-003 are resolved, and the package is ready for implementation.

## Findings

None open.

## Classification

N/A (Pass).

## Recommended Recipient

Implementation Engineer (`/implementation_engineer`). The Solution Designer is informed.

## Residual Risks And Notes (non-blocking)

1. **DN-6.** The live list signal stays with the implementation. Remove a deleted run's entry from `ClosedDelegations`.
2. **The extraction.** `deliverMessageToPeerRun` keeps the router's behavior, and the existing `send_message_to(node)` tests stay green.
