# Solution Revision Record — managed-ubuntu-auto-restart (autobyteus-15)

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial coherent baseline (Task autobyteus-15 and user comment, 2026-11-21) | N/A | N/A | Approved | BEH-001..005, REQ-001..009, AC-001..011 | Approved by Solution Designer within the direction, user informed |
| SR-002 | Design | Architecture design on approved SR-001 | N/A | Requirements Approved; no design | Requirements Approved; design Ready | BEH-001..005; REQ-001..009 | design-spec.md DS-001..DS-004; Medium / High; Architecture Design Complete |

## Revision Entries

### SR-001 — Automatic install and reopen for opted-in managed Ubuntu, waiting for a safe moment

- Phase and classification: Requirements, `Initial Baseline`
- Triggering input: Project Task autobyteus-15 (description and user comment of 2026-11-21)
- Triggering finding IDs: N/A
- Prior status: N/A
- Current status: requirements `Approved`; design not yet created
- IDs affected: BEH-001..005, UC-001..004, REQ-001..009, AC-001..011, SCN-001..007, DEC-001..007, ASM-001
- Scenario basis: SCN-001..006 Supported Normal; SCN-007 Supported Explicit Edge (existing failure contracts)
- Why recorded: first coherent baseline
- Canonical sections: all of `requirements-doc.md`; `investigation-notes.md` requirements-phase sections; `follow-ups.md` FU-001
- Supplements: None
- Product design: N/A
- Intended behavior changed: `Yes` (new behavior relative to the code: managed automatic restart)
- Approval: Solution Designer within the direction (the Task delegates safe timing and failure handling; no `Needs user` decision); reference: message informing the user in this run, 2026-11-21
- Supplement versions: N/A
- Design/review basis: N/A
- Classification: N/A before design
- Handoff outcome: N/A
- Downstream impact: architecture design next
- Remaining gaps: ASM-001 and UNK-001 for architecture
- Next action: architecture investigation and design

### SR-002 — Architecture design

- Phase and classification: Design, `Initial Baseline` of the design
- Trigger: approved requirements SR-001
- Triggering finding IDs: N/A
- Prior status: requirements Approved; no design
- Current status: requirements Approved (unchanged); `design-spec.md` Ready
- IDs affected: BEH-001..005, REQ-001..009, AC-001..011; spines DS-001..DS-004
- Scenario basis changes: None
- Why recorded: design completed
- Canonical sections changed: `design-spec.md` (new); `investigation-notes.md` Architecture Investigation Findings (A-F01..A-F08), Findings Index, UNK-001 resolved
- Supplements: None
- Intended behavior changed: `No`
- Approval: SR-001 approval applies unchanged; design approval by the user not required by the direction
- Design/review basis: new
- Classification: task_size `Medium`, architectural_risk `High` (unattended activation and relaunch on the protected install, new concurrency with Quit/switch/click, new server REST route consumed by Electron main, ASM-001 to validate)
- Handoff outcome: see `handoff-architecture-review.md`
- Downstream impact: independent architecture review per handoff rules
- Remaining gaps: ASM-001 (validated in the managed Ubuntu guest)
- Next action: architecture review
