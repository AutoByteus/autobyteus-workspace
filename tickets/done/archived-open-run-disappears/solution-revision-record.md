# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial coherent baseline (Project Task 2026-10-08; open point 3 of `workspace-history-group-archive`) | N/A | N/A | Ready for Approval | BEH-001..005, REQ-001..006, AC-001..008 | Presented to user with DEC-001..003 |
| SR-002 | Requirements | User clarifications and approval (2026-10-08) | N/A | Ready for Approval | Approved | BEH-006, UC-005, REQ-006..008, AC-008, AC-009, SCN-005, SCN-006, DEC-001..003 | Approved with recommended options |
| SR-003 | Design | Architecture investigation and design | N/A | Requirements Approved; design N/A | Requirements Approved; design Ready | BEH-001..006 | `design-spec.md`; task_size=Small, architectural_risk=Low |

## Revision Entries

### SR-001 — Requirements baseline: archived open run must disappear

- Phase and classification: Requirements — Initial Baseline
- Triggering evidence: Project Task from `/project_task_manager`; prior receipt `/Users/normy/autobyteus_org/autobyteus-worktrees/ticket-receipts/workspace-history-group-archive-terminal.md` open point 3; prior live evidence in `tickets/done/workspace-history-group-archive/api-e2e-*`.
- Triggering finding IDs: N/A
- Prior authoritative requirements/design status: N/A
- Current authoritative requirements/design status: Requirements Ready for Approval; design not started
- IDs affected: BEH-001..005, UC-001..004, REQ-001..006, AC-001..008, SCN-001..005, DEC-001..003
- Scenario-basis changes: N/A (baseline)
- Why recorded: first coherent baseline for user approval
- Canonical sections changed: all (new)
- Supplemental artifacts: none
- Product design evidence: N/A
- Intended behavior changed: N/A (baseline)
- Approval impact: pending
- Behavior-defining supplement versions: N/A
- Affected design/review basis: N/A
- Post-design classification: N/A
- Applied handoff-rule outcome: N/A (approval hold)
- Downstream impact: N/A
- Remaining gaps: DEC-001..003; team open-run case is code-derived (UNK-001)
- Next action: obtain explicit user approval and decisions

### SR-002 — Approved requirements with Delete and safety net

- Phase and classification: Requirements — Refinement (Requirement change approved by the user)
- Triggering user feedback: 2026-10-08 conversation. The user confirmed the problem summary; asked what "old address opened again" means (answered: rare after the fix — web Back button or a failed navigation; treated as a safety net); asked what Delete means (answered: permanent removal incl. data; only the on-screen outcome of deleting an open run is in question); then approved: "we use the recommended one … I think it's now approved." / "Your recommended approach is reasonable."
- Triggering finding IDs: N/A
- Prior status: Ready for Approval
- Current status: Approved
- IDs affected: added BEH-006, UC-005, REQ-007, REQ-008, AC-009, SCN-006; revised REQ-006, AC-008, SCN-005; DEC-001..003 decided (A, A, A)
- Scenario-basis changes: SCN-005 stale address / browser Back recorded as a Supported Explicit Edge Scenario per approved DEC-002; SCN-006 added
- Why recorded: user approval
- Canonical sections changed: requirements-doc status, behavior table, scope, requirements, ACs, scenarios, UI section, decisions, traceability, readiness
- Supplemental artifacts: none
- Intended behavior changed: Yes (Delete in scope; safety net) — approved
- Approval impact: Approved baseline SR-002; reference: user messages 2026-10-08 quoted above
- Behavior-defining supplement versions: N/A
- Affected design/review basis: design not yet created
- Post-design classification: N/A
- Applied handoff-rule outcome: N/A
- Downstream impact: none yet
- Remaining gaps: UNK-001 (team open case live)
- Next action: architecture design

### SR-003 — Architecture design complete

- Phase and classification: Design — Initial design
- Trigger: approved SR-002
- Triggering finding IDs: N/A
- Prior status: requirements Approved; design N/A
- Current status: requirements Approved (unchanged); design Ready
- IDs affected: BEH-001..006 mapped to DS-001..DS-004
- Scenario-basis changes: none
- Why recorded: design completed
- Canonical sections changed: `design-spec.md` (new); investigation-notes Architecture Investigation Findings
- Supplemental artifacts: none
- Intended behavior changed: No
- Approval impact: none (SR-002 approval still applies)
- Behavior-defining supplement versions: N/A
- Affected design/review basis: N/A (first design)
- Post-design classification: task_size=Small, architectural_risk=Low (four web files in existing owners; no API/persistence/ownership change; safety net reuses `RUN_ARCHIVED`)
- Applied handoff-rule outcome: see `handoff-architecture-design-complete.md`
- Downstream impact: implementation per handoff rules
- Remaining gaps: UNK-001 live check
- Next action: route per handoff rules
