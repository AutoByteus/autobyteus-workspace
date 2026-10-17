# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial baseline from the PM Task (2026-10-13) | N/A | N/A | Ready for Approval | BEH-001..005; REQ-001..008; AC-001..010 | Presented for user approval |
| SR-002 | Requirements | User approval (2026-10-13) | N/A | Ready for Approval | Approved | All (unchanged) | Approved; design started |
| SR-003 | Mixed (Design + Requirements clarification) | Architecture investigation (2026-10-13) | N/A | Approved; design N/A | Design Ready; REQ-004 clarification Ready for Approval | REQ-004, AC-002 | Design complete, Large / High; waiting for the user's confirmation of the REQ-004 clarification |
| SR-007 | Requirements + Design | User UX direction: clean UI, reuse the existing experience (2026-10-13) | N/A | Approved (SR-004); design SR-006 | Approved (SR-007); design Ready | REQ-005, REQ-007 (removed); AC-008 (removed); DEC-005, DEC-007, DEC-010 | No "Your choice" label or Reset; same experience as user-launched runs |
| SR-006 | Design | Architecture re-review ARCH-REV-002 Fail (2026-10-13) | AR-006 | Design Ready (SR-005), review Fail | Design Ready (revised) | REQ-009, AC-002 | Stop protocol without waiting at the queue head; Large / High |
| SR-005 | Design | Architecture review ARCH-REV-001 Fail (2026-10-13) | AR-001..AR-005 | Design Ready (SR-004), review Fail | Design Ready (revised) | REQ-001, REQ-002, REQ-003, REQ-005, REQ-006, REQ-009; AC-003, AC-006, AC-007, AC-011 | Revised; resubmitted; Large / High |
| SR-004 | Mixed (Requirements change + Design) | User proposal: stop copies independently, edit while stopped, resume with a message; Stop on the copy's own row (2026-10-13) | N/A | SR-003 (clarification pending) | Requirements Approved; design Ready | REQ-001, REQ-004, REQ-009 (new); AC-001, AC-002, AC-004, AC-011 (new); SCN-006; DEC-004, DEC-008, DEC-009 | Stop-then-edit design; Large / High |

## Revision Entries

### SR-001 — Initial requirements baseline: change a delegated copy's model

- Phase and classification: Requirements, `Initial Baseline`
- Triggering: Project Task `project_task_025b20cb-3fcb-438e-b910-cad1cd0c286b` from `/project_task_manager`, 2026-10-13
- Triggering finding IDs: N/A
- Prior authoritative requirements/design status: N/A
- Current authoritative requirements/design status: requirements `Ready for Approval`; design not started
- Requirement, behavior, acceptance-criteria, scenario or decision IDs affected: all initial
- Scenario-basis or scenario-validity changes: N/A
- Why recorded: first baseline for approval
- Canonical sections changed: `requirements-doc.md`, `investigation-notes.md` created
- Supplemental artifacts: none
- Product design evidence: N/A
- Intended behavior changed: N/A
- Approval impact: pending
- Affected design/review basis: N/A
- Post-design classification: N/A
- Applied handoff-rule outcome: N/A (approval hold)
- Downstream impact: N/A
- Remaining gaps: UNK-001 (architecture)
- Next action: user approval

### SR-002 — User approval

- Phase and classification: Requirements, `Refinement` (approval only)
- Triggering: the user asked whether the UI should be designed first. On the answer that the existing rows, controls and Save bar are reused, the user approved: "okayyy. approve. i think you have good judgement" (2026-10-13)
- Intended behavior changed: No
- Approval impact: baseline approved, including DEC-001..DEC-007; no separate UI design step
- Next action: architecture investigation and design

### SR-003 — Architecture design; REQ-004 clarification

- Phase and classification: Mixed (`Design` + `Requirement Gap` clarification)
- Triggering: architecture investigation found that input which arrives while an agent is busy enters its live session queue and cannot be moved to a new session safely
- Intended behavior changed: Yes, a narrow clarification. Messages already waiting for the agent when the change is saved finish on the previous model; the switch happens once the agent is quiet. AC-002 is updated.
- Approval impact: renewed user confirmation needed for the REQ-004 clarification before handoff. All other approved content is unchanged.
- Design: `design-spec.md` created; `task_size=Large`, `architectural_risk=High`
- Next action: user confirmation → architecture review

### SR-004 — Stop-then-edit (user's proposal)

- Phase and classification: Mixed (`Requirement Gap` resolved by the user + `Design`)
- Triggering: instead of confirming the SR-003 clarification, the user proposed: "the task agent team copy and the task agents copy can be stopped independently … if there's a stop button, I stop it, then … I can just modify it … And then … send another message to trigger it to continue. This will be more flexible". The Solution Designer agreed and restated the plan; the user replied: "Yeah, exactly. And the stop button can appear on the dedicated task agent copy or task agent team copy itself, just like … the parents" (2026-10-13).
- Intended behavior changed: Yes.
  - Editing is allowed only while the copy is stopped.
  - A new per-copy Stop (sidebar row, like parent runs, and Settings row).
  - Resume by message.
  - The SR-003 next-turn clarification is withdrawn.
- Approval impact: the user's messages above are the approval of the SR-004 requirements.
- Decisions by the Solution Designer within it:
  - Stop also stops the copies the copy started (DEC-008).
  - A Save on a copy woken during editing is refused (AC-011).
  - Collaborators get Stop too (DEC-001).
- Design: `design-spec.md` revised to SR-004 (forced restorable per-copy shutdown, edit command gated on offline, no live switch); `task_size=Large`, `architectural_risk=High`.
- Applied handoff-rule outcome: `handoff-architecture-design-complete.md`
- Next action: architecture review

### SR-005 — Design revision for ARCH-REV-001

- Phase and classification: Design, `Design Impact`
- Triggering report: `design-review-report.md` (ARCH-REV-001, Fail), findings AR-001..AR-005 plus two non-blocking notes
- Changes (design-spec → Revision Notes (SR-005)):
  - AR-001: validate first, then serialized check/commit/swap (queue step for task copies, handle activation fence for collaborators); stopped defined per copy.
  - AR-002: Stop set by delegator lineage and helper ownership, innermost first; unattributed older copies stated as a limit; forced Stop waits for live leases.
  - AR-003: "follows its team" from the recorded member fact; equality only for configured-placement copies.
  - AR-004: a combined all-or-nothing stopped-root Save.
  - AR-005: extra/teammate copies start on started values.
- Requirements: editorial only. The traceability duplicate is removed, and REQ-006 states the AR-005 consequence of the approved per-instance rule. No intended-behavior change: DEC-008 "stops the copies it started" is kept as told to the user. The unattributed-older-copies limit is an edge stated in the design and docs.
- Investigation notes: SR-003 next-turn content marked superseded; review findings verified.
- Approval impact: none (SR-004 approval stands)
- Classification: unchanged, `Large` / `High`
- Next action: architecture re-review

### SR-006 — No lease wait at the queue head (ARCH-REV-002 AR-006)

- Phase and classification: Design, `Design Impact`
- Change:
  - Stop marks its set as stopping;
  - new leases on those chains are refused (`TASK_EXECUTION_STOPPING`);
  - leases already held drain outside the queue;
  - then a non-waiting `stop` queue step runs per copy, innermost first;
  - the mark clears afterwards.
  Collaborator Stop uses the handle fences only.
- Delivery outcomes: messages/delegations into or out of a stopping copy return `accepted: false`, `TASK_EXECUTION_STOPPING`, "This copy is being stopped by the user." After the Stop completes, messages resume the copy normally.
- Intended behavior changed: No. While a Stop is in progress, agents' messages to or from that copy are refused instead of waking it, which is consistent with the user stopping it.
- Approval impact: none
- Next action: architecture re-review

### SR-007 — Clean UI, reuse the existing experience

- Phase and classification: Requirements refinement (user) + Design
- Triggering: the user questioned the "Your choice" label and undo: keep the UI as clean as possible; delegated agents and teams should get the experience user-launched runs already have (stop, edit members while stopped, Save). The user then said: "propose the reasonable user experience … It's clear now. You can work on your own." (2026-10-13)
- Intended behavior changed: Yes. REQ-005 display (no label after a change); REQ-007/AC-008 removed; DEC-010 added.
- Approval impact: the user's statements above are the approval
- Design: Revision Notes (SR-007); classification unchanged
- Next action: architecture re-review of SR-006 + SR-007

## Review Notifications

- 2026-10-13: Architecture review `ARCH-REV-003` **Pass** on SR-006 + SR-007 (`design-review-report.md`). The reviewer delivered the implementation handoff to `/software_engineering_team/implementation_engineer`. Non-blocking notes:
  - the design-spec body still shows superseded shapes; the Revision Notes are authoritative, as the reviewer told the implementer;
  - refuse at `acquireAtHead` when the chain is marked stopping.
  Informational; no Solution Designer handoff.
