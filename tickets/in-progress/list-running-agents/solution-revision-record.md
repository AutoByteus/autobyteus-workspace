# Solution Revision Record — list-running-agents (autobyteus-492)

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial coherent baseline (Task autobyteus-492 with the founder's comments of 2026-11-18 and the PM's message on roots) | PRB-001, PRB-002 | N/A | Ready for Approval | BEH-001…008, REQ-001…012, AC-001…009 | Four decisions put to the founder |

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
