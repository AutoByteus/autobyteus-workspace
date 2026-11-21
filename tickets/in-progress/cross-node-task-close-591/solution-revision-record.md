# Solution Revision Record: cross-node-task-close-591

| SR | Date | Kind | Summary | Status after |
| --- | --- | --- | --- | --- |
| SR-009 | 2026-11-21 | Design Impact (the implementation engineer: DN-6's premise) | B's closed-delegation state lives in one small node file (`closed-delegations.json`, owner `ClosedDelegations`), read once; the list filters in memory; the run-file field withdrawn | Design `Ready` |
| SR-008 | 2026-11-21 | Design Impact (ARCH-REV-002 AR-002) | DN-8: a remote run skips the local conversation check; its work goes through the existing peer delivery (`senderRoot.deliverToPeerRun`, extracted from the router into one function both use), chosen by `toExistingRun` | Design `Ready` |
| SR-007 | 2026-11-21 | Design Impact (ARCH-REV-001 AR-001, notes 1-2) | DN-1b: one ordered sequence per remote run (one notice in flight; the re-delegated work after `open` is confirmed; B answers after its Stop); DN-5: round-trip fields; DN-8: the local `deliverToRun` path, not `work_packet` | Design `Ready` |
| SR-006 | 2026-11-21 | Design | DN-1's trigger is the run's entries (close, re-delegation), not the Task's reopen; DN-8 adds the remote re-delegation (the `:370` refusal removed; the work through the link) | Design `Ready`, Medium / High |
| SR-005 | 2026-11-21 | Requirements (the PM's new comment; a correction) | Local reopen read: it reopens no run; the run returns when given the Task again. SR-003's "reopen lists the run" corrected to that. REQ-006 / DEC-007: giving a saved or reopened Task to an existing remote run, as locally (the PM's stuck case) | Approved; design to revise |
| SR-004 | 2026-11-21 | Design | Delegation-state notices from the delegating node (closed / open), owed and retried; the peer records, stops and lists by them; Medium / High | Design `Ready` |
| SR-003 | 2026-11-21 | Requirements (the user) | Reopen behaves as locally: the run is listed on the peer again, stopped, on the Task's reopen, not only on a later message; REQ-005, BEH-004, AC-006, SCN-004 | Approved |
| SR-002 | 2026-11-21 | Requirements | DEC-004 decided by the user: like a local closed delegated run, the remote run stops and leaves the peer's run list; REQ-005 and AC-006 rewritten; requirements approved | Approved |
| SR-001 | 2026-11-21 | Requirements | Baseline. Root cause: the delegating node skips remote runs at a Task's close (F-1, the founder's log F-2). REQ-001 … REQ-005; DEC-001 … DEC-003, DEC-005 and DEC-006 decided; DEC-004 (how the stopped run shows on the peer) put to the user | Ready for Approval |

### SR-001

- **Trigger:** Task `autobyteus-591`, from `/project_task_manager`, on the founder's word.
- **Investigation:** `investigation-notes.md`, F-1 … F-8.
- **Next:** the user's answer on DEC-004, then approval and the architecture design.

### SR-002

- **Trigger:** the user's answer: "the resource on the remote node should also be closed just like the task agent and task agent team … otherwise you leave a lot of task agent or task agent team on the remote".
- **Change:** DEC-004 is (b) "as for a local one", not the earlier recommendation (a). REQ-005, AC-006, BEH-004, the UI section and Data Continuity follow.
- **Approval:** DEC-004 by the user; the rest by the Solution Designer within the direction, with the user informed. `Approved`.
- **Next:** architecture investigation and design.

### SR-003

- **Trigger:** the user: "on the local node side when you close the ticket of course it's gone and then when you reopen the ticket you delegate again or you send a message again … I feel like the behavior on the UI should be similar".
- **Change:** a reopen on the delegating node lists the remote run on the peer again (stopped), as a local delegated run returns to the list on reopen. So the delegating node now tells the peer about both the close and the reopen, both retried when the peer is unreachable (REQ-002).
- **Approval:** the user's words. `Approved`.

### SR-004 (design)

- **Design:** `design-spec.md`, DN-1 … DN-7.
  - A sends each remote run's delegation state (closed / open), computed at send time by `isOpen`, owed and retried every 30 s.
  - B records `delegationClosedAt`, stops the run through its ordinary Stop, and drops it from its list. On open, it lists the run again.
- **Classification:** `Medium` / `High`.
- **Next:** architecture review.

### SR-005

- **Trigger:** the Task's new comment from the PM: after reopening `ad_hoc_task_889b2aa6-…`, `send_message_to` to docker-8001 was refused with `TASK_AGENT_RESOURCE_CLOSED`.
- **Read:**
  - A Task's reopen leaves its entries closed (`task-execution-resource-service.ts:180-194`: only `reopenAssignment` reopens an entry, from `delegate_task` with the run's ID and `task_id`).
  - A message to a run whose entries are all closed is refused (`cross-run-message-delivery.ts:57`).
  - For a remote run, `delegate_task` with `task_id` is refused (`task-delegation.ts:370`).
- **Correction:** SR-003 wrote that a reopen lists the run again. Locally it doesn't; the re-delegation does. REQ-005, BEH-004, AC-006 and DEC-004's text are corrected, and the user is told.
- **Added:** REQ-006, BEH-006, UC-004, SCN-005, AC-007 and DEC-007 (decided within the direction; the user is informed).
- **Design impact:** DN-1's trigger becomes the entry's open/close (the close, and the re-delegation), not the Task's reopen, plus a new DN for the remote re-delegation.

### SR-006 (design)

- **Change:** DN-1, S-4, the walks and the scope follow SR-005, and DN-8 is added.
- **Next:** architecture review (SR-004 wasn't sent yet; this package replaces it).

### SR-007

- **Trigger:** ARCH-REV-001, Fail, AR-001, plus notes 1-2.
- **Premise read:** `task-delegation.ts:398-401` (`deliverToRun`, `TASK_ASSIGNMENT_MESSAGE_TYPE`) and `collaboration-composition.ts:236` (`crossRun.route`).
- **Change:** DN-1b, DN-5's round-trip, DN-8's path, S-4 and the walks.
- **Next:** architecture review.

### SR-008

- **Trigger:** ARCH-REV-002, Fail, AR-002. The reviewer read DN-8's two "to verify" premises, and both fail.
- **Verified:** `cross-run-message-delivery.ts:100-109` and `global-agent-run-message-router.ts:185-205`.
- **My miss:** I left two premises as "to verify" instead of reading them before handing off (lesson 2).
- **Change:** DN-8, S-4 and the scope.
- **Next:** architecture review.

### Review of SR-006 … SR-008

- ARCH-REV-001 failed with AR-001, resolved by SR-007. ARCH-REV-002 failed with AR-002, resolved by SR-008.
- ARCH-REV-003: **Pass** (`design-review-report.md`). The reviewer sent the package to the implementation engineer.

### SR-009

- **Trigger:** the implementation engineer's Design Impact on DN-6, with options (a) … (d).
- **Read:**
  - the listing reads index rows only;
  - the index readers are strict;
  - the founder's node lists 1,070 rows.
- **Decision (Solution Designer):** a variant of (c). One B-side record is the only source; DN-5's run-file field is withdrawn.
  - (a) is rejected: the rollback erases history.
  - (b) is rejected: about 1,070 reads on the first list paint.
- **My miss:** DN-6's premise was left "to verify" (lesson 2, again).
- **Next:** architecture review. The engineer goes on with the parts that don't depend on it.

### Review of SR-009

- ARCH-REV-004: **Pass** (`design-review-report.md`). The reviewer verified that the index readers are strict, and sent the package to the implementation engineer.
- Note to the implementation: remove a deleted run's entry from `ClosedDelegations`.
