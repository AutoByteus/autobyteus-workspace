# Solution Revision Record — managed-ubuntu-auto-restart (autobyteus-15)

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial coherent baseline (Task autobyteus-15 and user comment, 2026-11-21) | N/A | N/A | Approved | BEH-001..005, REQ-001..009, AC-001..011 | Approved by Solution Designer within the direction, user informed |
| SR-002 | Design | Architecture design on approved SR-001 | N/A | Requirements Approved; no design | Requirements Approved; design Ready | BEH-001..005; REQ-001..009 | design-spec.md DS-001..DS-004; Medium / High; Architecture Design Complete |
| SR-003 | Design | ARCH-REV-001 Fail / Design Impact | AR-001, AR-002, AR-003 | design Ready (SR-002), review Fail | design Ready (SR-003); requirements unchanged | BEH-001, BEH-002; REQ-002, REQ-004 | Corrections in design-spec.md "SR-003 Response To ARCH-REV-001"; Medium / High unchanged |
| SR-004 | Design | ARCH-REV-001 re-review notes (cross-owner finalization; inactive identity) | AR-001, AR-002 | design Ready (SR-003) | design Ready (SR-004); requirements unchanged | BEH-001; REQ-002 | Two-phase busy observation (inspect per owner, finalize both in one synchronous turn); run-object keys, missing entry and `inactive` → unknown |

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

### SR-003 — Design corrections for ARCH-REV-001

- Phase and classification: Design, `Design Impact`
- Trigger: `design-review-report.md` ARCH-REV-001 (Fail), reviewed basis SR-001 / SR-002 at `7841e53020`
- Triggering finding IDs: AR-001, AR-002, AR-003
- Prior status: requirements Approved; design Ready (SR-002), review Fail
- Current status: requirements Approved (unchanged); design Ready (SR-003)
- IDs affected: BEH-001, BEH-002; REQ-002, REQ-004; AC-002, AC-003, AC-004; QR-001; DS-002, DS-003, DS-004
- Scenario basis changes: None (MP-001..MP-003 refine SCN-002..SCN-004)
- Why recorded: review corrections
- Canonical sections changed: `design-spec.md` (new "SR-003 Response To ARCH-REV-001", DS-002/DS-003 narratives, bounded local spine and new "Admission Boundary", interfaces, examples, tradeoffs, guidance, file map names); `investigation-notes.md` A-F09..A-F12
- Supplements: None
- Intended behavior changed: `No`. The five-minute rule, the busy definition and Quit-stays-closed are unchanged; only freshness, unknown handling and Quit observation are corrected
- Approval: SR-001 approval applies unchanged; no renewed approval needed
- Design/review basis: SR-002 review result applies only to SR-002; SR-003 needs re-review
- Classification: Medium / High (unchanged)
- Handoff outcome: re-review by `/architecture_reviewer` (handoff rule 1); see `handoff-architecture-review.md`
- Downstream impact: no implementation before a passing review
- Remaining gaps: ASM-001 (guest validation)
- Next action: architecture re-review

### SR-004 — Cross-owner finalization of the busy observation

- Phase and classification: Design, `Design Impact` (clarification within AR-001/AR-002)
- Trigger: architecture reviewer's re-review notes on SR-003 (2026-11-21): per-owner status re-read could age while the other owner's inspection was pending; absent map entries and `inactive` (`codex-thread.ts:141`, thread changed during the read) read as idle
- Current status: requirements Approved (unchanged); design Ready (SR-004)
- IDs affected: REQ-002, AC-002, QR-001; DS-002
- Canonical sections changed: `design-spec.md` "SR-004 clarification", SR-003 response row AR-002, DS-002 primary spine and narrative, interfaces (`inspectBackgroundWork` / `finalizeBusyRuns`, application `inspectBusy` / `finalizeBusy`), examples, change sequence tests, file map
- Intended behavior changed: `No`; no renewed approval
- Classification: Medium / High (unchanged)
- Next action: architecture re-review

## Review record

- 2026-11-21: ARCH-REV-002 **Pass** on SR-001 requirements / SR-004 design at `f36286782f` (Medium / High); AR-001..AR-003 resolved. Report `design-review-report.md`, `architecture-review-revision-record.md`. The reviewer delivered the primary handoff to `/implementation_engineer`; no duplicate forwarding by the Solution Designer.
