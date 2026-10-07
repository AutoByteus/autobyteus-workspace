# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Mixed (Requirements + Design) | User request 2026-10-07; approval in the same conversation | N/A | N/A | Requirements Approved; Design Ready | BEH-001..008, REQ-001..011, AC-001..014, SCN-001..005, DEC-001..003 | Architecture Design Complete (Large / High); ARCH-REV-001 completed with `Fail` before SR-001 was withdrawn (factual correction 2026-10-07, AR-004) |
| SR-002 | Mixed | User change 2026-10-07: no automatic status change | N/A | Approved / Ready (SR-001) | Requirements Approved; Design Ready | BEH-001, 002, 008; REQ-001, 003, 006, 007, 011; AC-001, 003, 006, 009, 011, 013, 014; new AC-015; new DEC-004 | Architecture Design Complete (Large / High) |

## Revision Entries

### SR-001 — Reactivate a DONE Task's assignment by messaging its run ID

- Phase and classification: Mixed, `Initial Baseline`
- Triggering user feedback: User conversation 2026-10-07. The Product Team could not be reached after its ad hoc Task was set DONE ("It's not your mistake… our software should be supporting you to do that"; "if you send it to the coordinator again, it should reactivate the team").
- Triggering finding IDs: N/A
- Prior authoritative requirements/design status: N/A
- Current authoritative requirements/design status: Requirements `Approved`; design `Ready`
- Requirement, behavior, acceptance-criteria, scenario or decision IDs affected: all (baseline)
- Scenario-basis or scenario-validity changes: N/A
- Why this baseline was recorded: new package, delivered before `project-manager-ux` (on hold)
- Canonical sections changed: all created
- Supplemental artifacts: None
- Product design evidence: N/A
- Intended behavior changed: N/A (baseline)
- Approval impact: Approved 2026-10-07: "Let's work on this first… It's already quite clear. Go ahead. You don't need my approval…". This approved the proposal with recommendations (a) helpers stay closed, (b) assigner only, (c) no team run ID, add kind.
- Behavior-defining supplement versions: None
- Affected design/review basis: N/A
- Post-design classification: `task_size=Large`, `architectural_risk=High` (shared tool/stream contracts, persisted state transition, ownership fence, concurrency; ~40 files across server, two contract packages, web)
- Applied handoff-rule outcome / result-file reference: `handoff-architecture-review.md` (this folder)
- Downstream and architecture-review impact: Independent architecture review required
- Remaining gaps: None blocking. Follow-up note: the agent repository's `project-task-management` skill text about DONE.
- Next action: Architecture Reviewer

### SR-002 — Task status stays the agent's; reactivation by message after the agent's own reopen

- Phase and classification: Mixed, `Requirement Gap` (user change to intended behavior)
- Trigger: user conversation 2026-10-07:
  - "It's the agent who should do that. It's not our software. Otherwise, our software turns it to do and then the agent is not aware of it."
  - "the task status is the agent responsibility. They will first mark as to do, or move it in progress, and then start to send a message again."
  - "Yes, the flow is as you understand."
  - "no automatic status change because if you silently change the status, the agent is not aware of it and this stays intransparent for the user. I think it's clear now."
- Triggering finding IDs: N/A
- Prior status: Requirements Approved (SR-001); design Ready. ARCH-REV-001 completed with `Fail` (AR-001) before the stop request of 2026-10-07 (factual correction, AR-004).
- Current status: Requirements Approved (SR-002); design Ready (SR-002)
- IDs affected:
  - REQ-003 replaced: no status write; refused while DONE, with a hint.
  - REQ-001 gains condition (c): the Task is not DONE.
  - REQ-007 becomes a message note, not a new result field.
  - REQ-005, REQ-006 and REQ-011 texts revised.
  - BEH-001, BEH-002 and BEH-008 revised.
  - AC-001, 003, 006, 009, 011, 013 and 014 revised; AC-015 added.
  - DEC-004 added (agent reopens the Task; the worker returns on the message, option A).
- Scenario-basis changes: SCN-001/002 now start with the agent's own reopen; SCN-004 includes "message while DONE".
- Canonical sections changed:
  - requirements-doc: all relevant sections;
  - design-spec: basis, Intended Change, behavior map, persisted data, DS-001/DS-L1, ownership, interfaces, file mapping (`AgentOperationResult` and the `send_message_to` result contract are no longer changed), examples, tradeoffs, risks, guidance;
  - investigation-notes: clarification and finding 7 marked moot.
- Supplemental artifacts: None
- Intended behavior changed: `Yes`
- Approval impact: The SR-002 basis was approved by the user's statements above. Live row reappearance (REQ-008) is unchanged and keeps its SR-001 approval; the user did not choose the reduced-scope option offered on 2026-10-07.
- Affected design/review basis: The SR-001 design and its unfinished review are superseded. The architecture review must cover SR-002.
- Post-design classification: unchanged, `task_size=Large`, `architectural_risk=High`. Two fewer server files change (no operation-result/send-contract field), but there are still shared stream/tool contracts, a persisted state transition, the ownership fence and concurrency.
- Applied handoff-rule outcome: `handoff-architecture-review.md` (updated for SR-002) → `/architecture_reviewer`
- Remaining gaps: Follow-up note for the agent repository's `project-task-management` skill text.
- Next action: Architecture review of SR-002

## Review Notes (informational, not solution rounds)

- 2026-10-07: Architecture review `Pass`, ARCH-REV-002 on SR-002.
  - Report: `design-review-report.md`; record: `architecture-review-revision-record.md`.
  - AR-001 is resolved by SR-002 REQ-006.
  - AR-002, AR-003 and AR-004 are non-blocking. The reviewer passed them to `/implementation_engineer` as guidance and forwarded the package there; the Solution Designer does not repeat that handoff.
  - AR-004 wording fixes in `design-spec.md` are deferred to the next solution revision, so the design basis does not change during implementation. The factual corrections in this record were applied now.
