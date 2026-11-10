# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial coherent baseline (Task autobyteus-12) | N/A | N/A | Ready for Approval | BEH-001..005, REQ-001..009, AC-001..008, DEC-001..011 | Awaiting the user's decisions DEC-001..003 and approval |
| SR-002 | Requirements | User conversation 2026-11-10 (design summary, location, approval) | N/A | Ready for Approval | Approved | REQ-003, REQ-005, AC-001, DEC-001, DEC-002, DEC-003, DEC-006, DEC-010, SCN-006 | Location `memory/semantic/<agent>/`; minimal instruction section; approved by the user |

## Revision Entries

### SR-001 — Requirements baseline for agent semantic memory

- Phase and classification: Requirements, `Initial Baseline`
- Triggering input: Project Task autobyteus-12 from `/project_task_manager` (the user's direction 2026-11-09/10)
- Triggering finding IDs: N/A
- Prior status: N/A
- Current status: requirements `Ready for Approval`; design not yet created
- IDs affected: BEH-001..005, SCN-001..006, UC-001..004, REQ-001..009, AC-001..008, DEC-001..011
- Scenario-basis changes: N/A (baseline)
- Why recorded: first coherent baseline presented to the user for approval
- Canonical sections changed: all of `requirements-doc.md`, `investigation-notes.md`; `follow-ups.md` FU-001..004 created
- Supplemental artifacts: `follow-ups.md`
- Product design evidence: N/A
- Intended behavior changed: N/A (baseline)
- Approval impact: pending the user's answer on DEC-001, DEC-002, DEC-003
- Behavior-defining supplements: None
- Design/review basis: N/A
- Task-size/risk classification: N/A before design
- Handoff: N/A
- Downstream impact: N/A
- Remaining gaps: UNK-001, UNK-002 (architecture phase)
- Next action: obtain the user's approval, then architecture design

### SR-002 — User decisions and approval

- Phase and classification: Requirements, `Refinement`
- Triggering input: the user in the Solution Designer conversation, 2026-11-10: (1) the system only tells the agent where its folder is; managing semantic memory (structure, rules, future distillation from work journals) is the agent's; (2) put it inside the memory folder as `semantic`; (3) "don't rename … the episodic … too much changes"; (4) "I agree with you" to the summarized design.
- Triggering finding IDs: N/A
- Prior status: Ready for Approval (SR-001)
- Current status: Approved
- IDs affected: REQ-003 (location `<data-dir>/memory/semantic/<agent>/`), REQ-005 (minimal section, no system rules), AC-001, DEC-001 (user: inside memory folder), DEC-002 (user: no history), DEC-003 (user: switch + path only), DEC-006 and DEC-010 (no system guidance), SCN-006; Out Of Scope gains "no renaming of run folders"
- Scenario-basis changes: SCN-006 mitigation is left to skills
- Why recorded: user decisions and approval
- Canonical sections changed: requirements Document Status, REQ-003, REQ-005, AC-001, Decisions, Out Of Scope, SCN-006, Readiness; investigation notes (scanner evidence, user evidence, RSK-001/002); follow-ups (a briefly added FU-005 removed after the user decided against renaming)
- Supplemental artifacts: `follow-ups.md`
- Product design evidence: N/A
- Intended behavior changed: Yes (location, instruction content)
- Approval impact: approved by the User, 2026-11-10, baseline SR-002
- Behavior-defining supplements: None
- Design/review basis: N/A (design not yet written)
- Task-size/risk classification: N/A before design
- Handoff: N/A
- Downstream impact: N/A
- Remaining gaps: UNK-001, UNK-002 (architecture)
- Next action: architecture design
