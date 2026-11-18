# Solution Revision Record — list-running-agents (autobyteus-492)

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial coherent baseline (Task autobyteus-492 with the founder's comments of 2026-11-18 and the PM's message on roots) | PRB-001, PRB-002 | N/A | Ready for Approval | BEH-001…008, REQ-001…012, AC-001…009 | Four decisions put to the founder |
| SR-002 | Requirements | The founder's two answers in the Solution Designer's conversation, 2026-11-18 | DEC-001, DEC-002 | Ready for Approval | Approved | BEH-003…005, UC-003/004, REQ-008…011, AC-005…008, SCN-003…006, DEC-001…004, DEC-011 | "The run ID is the address"; approved |
| SR-003 | Mixed | The founder's third and fourth messages, 2026-11-18 (clarifications 5, 6); design draft | DEC-012 | Approved (SR-002) → Ready for Approval (clarification 5) | Approved; design Ready | BEH-006, REQ-002, REQ-011, REQ-013, AC-002, AC-010, DEC-004, DEC-006, DEC-012 | Team run ID reaches its coordinator; list only user-started; design complete |
| SR-004 | Mixed | The founder's question, 2026-11-18: team run ID or coordinator's run ID? | DEC-012 | Approved (SR-003) | Approved; design Ready | BEH-006, REQ-002, REQ-011, REQ-012, REQ-013 (withdrawn), AC-002, AC-010 (withdrawn), DEC-004, DEC-006, DEC-012 | Today's rule kept: message a team through its coordinator's run ID; the list gives it |
| SR-005 | Mixed | The founder, 2026-11-18: no Org runs in the list for now | DEC-004 | Approved (SR-004) | Approved; design Ready | REQ-002, REQ-003, AC-002, DEC-004 | Org entries removed from the list; messaging unchanged |
| SR-006 | Mixed | ARCH-REV-001 (Fail: AR-001, AR-003 … AR-006) and the founder's entry fields (DEC-013) | AR-001, AR-003, AR-004, AR-005, AR-006 | Approved (SR-005); design Ready, review Fail | Approved; design Ready for ARCH-REV-002 | REQ-002, REQ-011, AC-002, AC-008, DEC-011, DEC-013; DS-004; entry-form rows 13, 14; removal plan | Closed-Task admission on the `node` path; senders that cannot know a closure; team guidance from this node's own team; dead `ownershipChain` removed; `agent_run_id` / `team_run_id` / `team_coordinator_agent_run_id` / `workspace` |

## Revision Entries

### SR-001 — Running-roots list plus a message rule between roots

- Phase and classification: Requirements, `Initial Baseline`
- Trigger: Task autobyteus-492 (description and two comments of 2026-11-18); PM message of 2026-11-18 (roots only); investigation probes PRB-001 … PRB-004.
- Triggering finding IDs: PRB-002 (an unrelated PM root on the same node is refused, `TASK_AGENT_RESOURCE_CONFLICT`), PRB-001 (an unknown or unlinked run ID is refused).
- Prior status: N/A. Current status: requirements `Ready for Approval`; design not started.
- IDs affected: all (baseline).
- Scenario basis: SCN-001 … SCN-006 proposed; SCN-005 explicit edge.
- Why recorded: first baseline for the founder's approval. The investigation showed the list alone cannot reach the goal: a message rule between user-started roots (DEC-001) is part of this ticket.
- Canonical sections: whole `requirements-doc.md`; `investigation-notes.md`.
- Supplements: None. Product design: N/A.
- Intended behavior changed: N/A (baseline).
- Approval impact: pending the founder (DEC-001 … DEC-004 `Needs user`).
- Design/review basis: N/A. Classification: N/A before design.
- Handoff: none; the approval question is held in the Solution Designer's conversation.
- Remaining gaps: the founder's answers.
- Next action: record the answers, approve, then architecture design.

### SR-002 — The run ID is the address (approved)

- Phase and classification: Requirements, `Refinement` (user change to intended behavior).
- Trigger: the founder in this conversation, 2026-11-18 (voice): (1) "This is definitely why we need to do refactoring … send_message_to has the target agent run ID; in theory you should be able to send a message to it … send_message_to also adds this node ID … the same for delegate_task." (2) "As long as you know the target's agent run ID you should be able to send a message to it … I don't see why the design should prevent it … doesn't matter if you're a task agent, a member in a task agent team, or from a remote node."
- Finding IDs: DEC-001 (answered (b)), DEC-002 (covered by the same answer).
- Prior status: Ready for Approval. Current status: Approved.
- IDs affected: BEH-003, BEH-004, BEH-005; UC-003, UC-004; REQ-008 … REQ-011; AC-005 … AC-008; SCN-003 … SCN-006; DEC-001 … DEC-004; new DEC-011.
- Scenario changes: SCN-006 turns from "refused as today" into "delivered" (a task agent messages outside its Task).
- Why: SR-001's "roots talk to roots" was narrower than the founder's rule.
- Sections changed: Problem And Desired Outcome, behavior table, use cases, preserved boundary, requirements, ACs, scenarios, decisions, readiness; investigation notes' clarifications.
- Intended behavior changed: `Yes`.
- Approval: the founder (`User`) for DEC-001/002 (his answer quoted above); DEC-003, DEC-004, DEC-011 by the Solution Designer within his direction, each keeping today's behavior or the PM's recorded reading, and told to him in the same conversation. Baseline: `requirements-doc.md` at SR-002.
- Supplements: None.
- Design basis: none yet. Classification: N/A before design.
- Next action: architecture investigation and design.

### SR-003 — A team run ID reaches the team; design complete

- Phase and classification: Mixed (`Refinement` of requirements; design baseline).
- Trigger: the founder, 2026-11-18 (voice). First (clarification 5) he seemed to narrow the new targets to the listed runs; I recorded it and set the requirements back to Ready for Approval. Then (clarification 6): "if you know the agent run ID or the agent team run ID, then you should be able to use send_message_to … reach … your task agent or your task agent team or your standalone agents or your standalone agent team … list_running_agents should only return the standalone ones." That restores SR-002's rule and adds team run IDs.
- Finding IDs: DEC-012 (new), DEC-006 superseded.
- Prior status: Approved (SR-002), briefly Ready for Approval. Current: Approved; design `Ready`.
- IDs affected: BEH-006, REQ-002 (no `message_run_id`; one `run_id` per run), REQ-011 (team-run-ID refusal no longer preserved), REQ-013 (new), AC-002, AC-010 (new), DEC-004, DEC-006, DEC-012.
- Intended behavior changed: `Yes` (team run IDs).
- Approval: the founder (`User`), his words above; reference this conversation.
- Design: `design-spec.md` written (SR-003 basis); classification `Large` / `High`.
- Next action: handoff per the rules (architecture review expected for Large/High).

### SR-004 — A team is messaged through its coordinator (today's rule kept)

- Phase and classification: Mixed (`Refinement`, user change to intended behavior; design revision).
- Trigger: the founder, 2026-11-18 (voice), asked my opinion: should a team run ID reach the coordinator, or keep today's behavior, the list giving the coordinator's run ID? "I think it's better to message the coordinator directly instead of messaging the team." I recommended keeping today's rule (reasons in DEC-012); he stated the same preference.
- IDs affected: BEH-006 (preserved again, also from a peer), REQ-002 (`coordinator_agent_run_id` on Team entries and team units), REQ-011, REQ-012, REQ-013 and AC-010 withdrawn, AC-002, DEC-004, DEC-006, DEC-012.
- Intended behavior changed: `Yes` (back to today's team-run-ID refusal).
- Approval: the founder (`User`), his words above.
- Design: team-run-ID resolution removed from the router and the removal plan; `RunningAgents.teamCoordinatorOf` gives the peer's refusal its guidance. Classification unchanged (`Large` / `High`).
- Review impact: the architecture review in progress reviews SR-004 (the reviewer was told).

### SR-005 — Org runs are not listed for now

- Phase and classification: Mixed (`Refinement`, user change; design revision).
- Trigger: the founder, 2026-11-18 (voice): "do you think it makes sense to list the user-started organization as well? I feel like at least for now we don't have to return that information, because I don't see much usage for messaging an organization." The Solution Designer agreed (DEC-004).
- IDs affected: REQ-002 (`kind` is `agent` or `agent_team`), REQ-003, AC-002, DEC-004. The message rule is unchanged: an agent inside an Org stays reachable by its run ID.
- Intended behavior changed: `Yes` (smaller list).
- Approval: the founder (`User`), his words above.
- Design: Org entry and units removed from the entry union, the listing rule and the run-file facts. Classification unchanged (`Large` / `High`).
- Review impact: the architecture review in progress reviews SR-005 (the reviewer was told).

### SR-006 — Review fixes (ARCH-REV-001) and the founder's entry fields

- Phase and classification: Mixed (`Design Impact` fixes; `Requirement Gap` clarifications within the direction; user change to entry fields).
- Trigger: ARCH-REV-001 (`design-review-report.md`), Fail: AR-001 (High), AR-003, AR-004, AR-005, AR-006. The founder, 2026-11-18 (voice): an Agent entry gives the agent run ID and its workspace, a Team entry the team run ID and the coordinator agent run ID, "similar to delegate task", and the team's workspace too.
- Responses:
  - AR-001: `CrossRunMessageDelivery.closedPeerRunRefusal` on the router's `node` path, before the sender's root (DS-004, entry-form row 13, tests).
  - AR-005: decided within DEC-011's direction: the node that holds the Task refuses for all its senders; senders on the run's own node or a third node, which cannot know the closure, are delivered while it runs and never wake it (REQ-011, AC-008, row 14). Recorded as the Solution Designer's decision, the founder informed.
  - AR-006: `RunningAgents.teamCoordinatorOf` from the team's own live root on this node; placed in DS-004 after `rootOf` returns null.
  - AR-004: `ownershipChain` removed (removal plan), the engine comment corrected; the unlinked endpoint has none.
  - AR-003: texts corrected (requirements baseline and readiness, REQ-002, interface check, investigation meta, RSK-001).
  - Residual suggestion: one sentence on why `RunStatusService` is not reused (Ownership Map).
- Founder's fields (DEC-013): Agent `agent_run_id`, `workspace`; Team `team_run_id`, `team_coordinator_agent_run_id`, `workspace` (its coordinator's). Approval: the founder (`User`), his words in DEC-013.
- Intended behavior changed: `Yes` (entry fields; the fenced-run outcome is stated, matching today's fence).
- Classification unchanged: `Large` / `High`.
- Next action: ARCH-REV-002.

### SR-007 — The closed-Task admission without `node` too (ARCH-REV-002 AR-007)

- Phase and classification: Design (`Design Impact`, Low).
- Trigger: ARCH-REV-002, AR-007: a sender in a root that does not link a fenced peer run, sending without `node`, left `CrossRunMessageDelivery.route` at its peer-run branch (`cross-run-message-delivery.ts:92-94`) and got "not running … also pass node" instead of CLOSED (MP-004), against REQ-011 and AC-008.
- Response: the reviewer's fix (a). The peer-run branch calls the same owner's `closedPeerRunRefusal` before returning `null`. The bounded spine, entry-form row 13, the Ownership Map and the test list are updated. Requirements unchanged.
- Intended behavior changed: `No`. Classification unchanged (`Large` / `High`).
- Next action: ARCH-REV-003.

### SR-008 — Design validation walkthrough (G-1, G-2)

- Phase and classification: Mixed (`Design Impact` found by the Solution Designer; a requirement clarification within the direction).
- Trigger: the founder, 2026-11-18: "validate by yourself for each use case … based on your data flow spine design … whether your design works or not". The walkthrough is in `design-spec.md` § Design Validation Walkthrough.
- Findings:
  - G-1: a message between unrelated local runs would be published live to both runs' views (`run-messages-feed.ts:26-43`) but dropped by the stored Team-tab read (`collaboration-participant-messages.ts:81-88`). Fix: not in run views, live or stored, like remote messages (`RunAcceptInput.publishToViews`); REQ-011 and DEC-014 state it.
  - G-2: the receiver's live root must come from `CollaborationRootResolver.resolveActive` (the root, with `acceptFromRun`), not `ActiveCollaborationRootDirectory.resolve` (a message boundary without it).
- Every other premise held (table in the design).
- Intended behavior changed: clarified (run views), within the direction; the founder informed.
- Classification unchanged: `Large` / `High`. Review impact: the design passed ARCH-REV-003 at SR-007 and implementation started; SR-008 goes back to the architecture reviewer (ARCH-REV-004), who routes the delta on.

### SR-009 — `resolveActive` is a target, not existing code (ARCH-REV-004 AR-008)

- Phase and classification: Design, editorial correction (no behavior or structure change).
- Trigger: ARCH-REV-004 Pass with AR-008 (Low, non-blocking): `CollaborationRootResolver.resolveActive` exists neither at HEAD nor at the base; it is in the implementation engineer's uncommitted diff, which the Solution Designer read in the shared worktree during the SR-008 walkthrough.
- Verified: `git show HEAD:autobyteus-server-ts/src/compositions/collaboration-root-resolver.ts` has `resolveOrRestore` only (77 lines).
- Changes: the Dependency Rules line and the walkthrough row state it as a target; `src/compositions/collaboration-root-resolver.ts` added to the file mapping (Modify: `resolveActive`; `standaloneRoots` gains `getActive`). `docs/design-cases.md` Case 5 records the lesson.
- Review impact: none (the reviewer passed SR-008 and asked for this wording in the next revision).
