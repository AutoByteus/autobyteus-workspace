# Solution Revision Record — list-running-agents (autobyteus-492)

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial coherent baseline (Task autobyteus-492 with the founder's comments of 2026-11-18 and the PM's message on roots) | PRB-001, PRB-002 | N/A | Ready for Approval | BEH-001…008, REQ-001…012, AC-001…009 | Four decisions put to the founder |
| SR-002 | Requirements | The founder's two answers in the Solution Designer's conversation, 2026-11-18 | DEC-001, DEC-002 | Ready for Approval | Approved | BEH-003…005, UC-003/004, REQ-008…011, AC-005…008, SCN-003…006, DEC-001…004, DEC-011 | "The run ID is the address"; approved |

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
