# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial coherent baseline (Task `autobyteus-461`) | N/A | N/A | Ready for Approval | BEH-001 … BEH-009, REQ-001 … REQ-010 | Requirements baseline presented to the user; DEC-001 needs the user |
| SR-002 | Mixed | The user's answer on DEC-001; feasibility investigation of the Team/Org part | N/A | Ready for Approval | Ready for Approval | REQ-003, REQ-004, AC-002, AC-006, DEC-001, DEC-009 | DEC-001 = wake (the user); DEC-009 (one ticket or two) needs the user |
| SR-003 | Mixed | The user's answer on DEC-009 (A); standalone architecture investigation and design | N/A | Ready for Approval | Requirements Approved; design Ready, the user's approval of the design pending | REQ-001, REQ-006, REQ-007, REQ-009, REQ-010, AC-006 (retired), AC-010, AC-012, SCN-002 (deferred), DEC-002, DEC-009 | Scope: standalone Agent runs; Team and Org runs → FU-001; design-spec written; Medium / High |
| SR-004 | Requirements | The user's direction change after the SR-003 design was presented | N/A | Requirements Approved; design Ready | Requirements Draft; design Needs Revision | DEC-010 (new), DEC-009 (superseded), all REQ (scope: Agent, Team and Org runs again) | The structure is corrected in this ticket; SR-003's design is not built |
| SR-005 | Requirements | The user's confirmation of the target and of "contract first"; the target contract written | N/A | Requirements Draft; design Needs Revision | Requirements Draft with a proposed contract; design Needs Revision | `target-collaboration-contract.md` (TC-1 … TC-4); DEC-003 (to be replaced by TC-1), DEC-004 (kept as TC-2) | The contract is proposed for the user's approval |
| SR-006 | Mixed | The user: validate the data structure, no redundant attributes, every case with example JSON as in the earlier model document | N/A | Requirements Draft with a proposed contract | Requirements Draft; contract revision 2 proposed | `target-collaboration-contract.md` revision 2 (records, cases D1–D7, E1–E12, attribute check, V-1 … V-12, S1 … S15, TC-1 … TC-5) | Data level validated on the user's stored data; three decisions need the user |

## Revision Entries

### SR-001 — Stop stops the run's own agents; its delegated copies keep running

- Phase and classification: Requirements, `Initial Baseline`
- Triggering user feedback, Product package, investigation evidence, or role/report/round: Task `autobyteus-461` from `/project_task_manager`, with the user's decision of 2026-11-10; investigation notes of 2026-11-10
- Triggering finding IDs: N/A
- Prior authoritative requirements/design status: N/A
- Current authoritative requirements/design status: requirements `Ready for Approval`; design not started
- Requirement, behavior, acceptance-criteria, scenario or decision IDs affected: BEH-001 … BEH-009, REQ-001 … REQ-010, AC-001 … AC-013, SCN-001 … SCN-008, DEC-001 … DEC-008
- Scenario-basis or scenario-validity changes: first basis; SCN-006 is a Supported Explicit Edge Scenario (DEC-004), the others Supported Normal Scenarios
- Why this baseline or revision was recorded: first coherent baseline used to ask the user for approval of the direction
- Canonical requirements, investigation and design sections changed: `requirements-doc.md` and `investigation-notes.md` created
- Supplemental artifacts added, changed or removed: none
- Product design evidence or product decisions incorporated: none
- Intended behavior changed: `Yes` (new behavior proposed, not yet approved)
- Approval impact, exact approved requirements baseline, who approved, and approval reference: not approved; the Task requires the user's approval of the direction, and DEC-001 (wake or hold) is the user's
- Behavior-defining supplement versions and approval references: none
- Affected design/review basis invalidated or rebuilt: N/A
- Post-design task-size/risk classification and rationale changes: N/A
- Applied handoff-rule outcome / result-file reference, when a handoff occurred: none (approval hold in the Solution Designer's conversation with the user)
- Downstream and architecture-review impact: none yet
- Remaining gaps, assumptions or blocked decisions: DEC-001; investigation notes U-001 and U-002 (architecture phase)
- Next action: the user answers DEC-001 and approves the direction; then architecture investigation and design

### SR-002 — Wake on a copy's message (the user's decision); one ticket or two is open

- Phase and classification: Mixed (requirements and evidence), `Refinement`
- Triggering user feedback, Product package, investigation evidence, or role/report/round: the user, 2026-11-10, in the Solution Designer's conversation: the platform's standard is "wake it up, resume it"; then the feasibility investigation of Team and Org roots (investigation notes, Architecture Investigation Findings)
- Triggering finding IDs: N/A
- Prior authoritative requirements/design status: `Ready for Approval` (SR-001); no design
- Current authoritative requirements/design status: `Ready for Approval`; no design
- Requirement, behavior, acceptance-criteria, scenario or decision IDs affected: REQ-003, REQ-004, AC-002, AC-006, SCN-003, DEC-001 (decided by the user: wake), DEC-009 (new, needs the user)
- Scenario-basis or scenario-validity changes: none
- Why this baseline or revision was recorded: a user decision was recorded and a scope decision was found
- Canonical requirements, investigation and design sections changed: requirements Document Status, Requirements, Acceptance Criteria, Scenarios, Decisions, Readiness Check; investigation notes Clarifications, Architecture Investigation Findings, U-001
- Supplemental artifacts added, changed or removed: none
- Product design evidence or product decisions incorporated: none
- Intended behavior changed: `No` against SR-001's recommendation (REQ-003 now states the wake rule the user chose)
- Approval impact, exact approved requirements baseline, who approved, and approval reference: not approved yet; DEC-009 changes the scope of this ticket, so it is the user's
- Behavior-defining supplement versions and approval references: none
- Affected design/review basis invalidated or rebuilt: N/A
- Post-design task-size/risk classification and rationale changes: N/A
- Applied handoff-rule outcome / result-file reference, when a handoff occurred: none
- Downstream and architecture-review impact: none yet
- Remaining gaps, assumptions or blocked decisions: DEC-009; U-002
- Next action: the user answers DEC-009; the requirements are then approved and the design starts

### SR-003 — Scope: standalone Agent runs (the user's decision); requirements approved; design written

- Phase and classification: Mixed (requirements, evidence, design), `Refinement`
- Triggering user feedback, Product package, investigation evidence, or role/report/round: the user, 2026-11-10, in the Solution Designer's conversation: "A please" (DEC-009: two steps); the standalone architecture investigation
- Triggering finding IDs: N/A
- Prior authoritative requirements/design status: `Ready for Approval` (SR-002); no design
- Current authoritative requirements/design status: requirements `Approved`; `design-spec.md` `Ready`, with the user's approval of the design `Pending` (the Task requires it before the build)
- Requirement, behavior, acceptance-criteria, scenario or decision IDs affected: REQ-001, REQ-006, REQ-007, REQ-009, REQ-010; BEH-002 (not changed by this ticket); AC-006 (retired), AC-010, AC-012; SCN-002 (deferred); UC-001, UC-008; DEC-002 (superseded), DEC-009 (decided)
- Scenario-basis or scenario-validity changes: SCN-002 stays a Supported Normal Scenario and is deferred to FU-001
- Why this baseline or revision was recorded: the scope decision, the approval and the completed design
- Canonical requirements, investigation and design sections changed: requirements Document Status, behavior table, Scope Guardrail, Requirements, Acceptance Criteria, Scenarios, Decisions, Traceability, Architecture Phase Input, Readiness Check; investigation notes Architecture Investigation Findings, U-002; `design-spec.md` created
- Supplemental artifacts added, changed or removed: `follow-ups.md` created (FU-001 Team and Org runs; FU-002 two files over the size limit)
- Product design evidence or product decisions incorporated: none
- Intended behavior changed: `Yes` against SR-002: Team and Org runs are out of this ticket (the user's decision)
- Approval impact, exact approved requirements baseline, who approved, and approval reference: approved at SR-003 by the Solution Designer within the direction; DEC-001 and DEC-009 decided by the user on 2026-11-10 in the Solution Designer's conversation
- Behavior-defining supplement versions and approval references: none
- Affected design/review basis invalidated or rebuilt: first design
- Post-design task-size/risk classification and rationale changes: `Medium` / `High` (a lifecycle change on the Stop path; one wire field gets a single meaning; a new history refusal; restart resume's filter)
- Applied handoff-rule outcome / result-file reference, when a handoff occurred: none yet (waiting for the user's approval of the design)
- Downstream and architecture-review impact: none yet
- Remaining gaps, assumptions or blocked decisions: the user's approval of the design
- Next action: the user approves the design; then the handoff by the handoff rules

### SR-004 — The user changes the direction: correct the structure in this ticket

- Phase and classification: Requirements, `Requirement Gap` (a user change to scope and approach)
- Triggering user feedback, Product package, investigation evidence, or role/report/round: the user, 2026-11-10, in the Solution Designer's conversation, after reading the SR-003 design and the explanation of the hosting gap: "we should start to refactor in this ticket instead of just try to fix the bug … put the data model correct and then the upper layer source code should reflect the data model"
- Triggering finding IDs: N/A
- Prior authoritative requirements/design status: requirements `Approved` (SR-003); design `Ready`, the user's approval pending
- Current authoritative requirements/design status: requirements `Draft`; design `Needs Revision` (not to be built)
- Requirement, behavior, acceptance-criteria, scenario or decision IDs affected: DEC-010 (new, the user); DEC-009 superseded; scope returns to Agent, Team and Org runs; DEC-003 (cascade of a copy's Stop) and REQ-007 (archive/delete) are reopened by the new structure
- Scenario-basis or scenario-validity changes: none yet
- Why this baseline or revision was recorded: the direction changed before any handoff
- Canonical requirements, investigation and design sections changed: requirements Document Status, Decisions, Readiness Check; design-spec status; investigation notes Clarifications and stored shapes; follow-ups FU-001 withdrawn
- Supplemental artifacts added, changed or removed: none
- Product design evidence or product decisions incorporated: none
- Intended behavior changed: `Yes` (scope and a required structure)
- Approval impact, exact approved requirements baseline, who approved, and approval reference: the SR-003 approval no longer applies to the changed scope; renewed approval is needed once the requirements are revised
- Behavior-defining supplement versions and approval references: none
- Affected design/review basis invalidated or rebuilt: the SR-003 design is superseded; no review had run
- Post-design task-size/risk classification and rationale changes: N/A until the new design
- Applied handoff-rule outcome / result-file reference, when a handoff occurred: none
- Downstream and architecture-review impact: none (nothing was handed off)
- Remaining gaps, assumptions or blocked decisions: the target data model and its staging; the user confirms the target model before the detailed design
- Next action: the user confirms the target model; then the architecture investigation, revised requirements and the new design

### SR-005 — The target contract: a delegated run is an ordinary run

- Phase and classification: Requirements, `Refinement`
- Triggering user feedback, Product package, investigation evidence, or role/report/round: the user, 2026-11-10: delegated runs "are their own runs … a normal run … their life cycle is dependent on the task", the relationship shown in the UI; "we always start with the contract"; investigation of the stored shapes and of peer-started runs
- Triggering finding IDs: N/A
- Prior authoritative requirements/design status: requirements `Draft` (SR-004); design `Needs Revision`
- Current authoritative requirements/design status: requirements `Draft` with the contract supplement `Proposed`; design `Needs Revision`
- Requirement, behavior, acceptance-criteria, scenario or decision IDs affected: TC-1 (replaces DEC-003 if approved), TC-2 (keeps DEC-004), TC-3, TC-4 (delivery in steps; this ticket: delegations from a standalone Agent run)
- Scenario-basis or scenario-validity changes: none yet; the requirements are rewritten after the contract is approved
- Why this baseline or revision was recorded: the contract is the first artifact the user asked for
- Canonical requirements, investigation and design sections changed: requirements Document Status and Supplemental Artifacts; investigation notes supplement inventory and peer-started-run findings
- Supplemental artifacts added, changed or removed: `target-collaboration-contract.md` added
- Product design evidence or product decisions incorporated: none
- Intended behavior changed: `Yes` (proposed)
- Approval impact, exact approved requirements baseline, who approved, and approval reference: nothing approved at SR-005; the user's approval of the contract, TC-1 and TC-4 is requested
- Behavior-defining supplement versions and approval references: `target-collaboration-contract.md` at SR-005, `Proposed`
- Affected design/review basis invalidated or rebuilt: none
- Post-design task-size/risk classification and rationale changes: N/A
- Applied handoff-rule outcome / result-file reference, when a handoff occurred: none
- Downstream and architecture-review impact: none
- Remaining gaps, assumptions or blocked decisions: TC-1, TC-4; the code design
- Next action: the user approves the contract; the requirements are rewritten on it; then the architecture investigation and design of this ticket's step

### SR-006 — Contract revision 2: the data level, validated on the stored data

- Phase and classification: Mixed (requirements and evidence), `Refinement`
- Triggering user feedback, Product package, investigation evidence, or role/report/round: the user, 2026-11-10: validate whether the data structure is reasonable and works, without redundant attributes; and follow the earlier model document, with example JSON for each case, so that the data level has no ambiguity
- Triggering finding IDs: N/A
- Prior authoritative requirements/design status: requirements `Draft`, contract revision 1 `Proposed` (SR-005); design `Needs Revision`
- Current authoritative requirements/design status: requirements `Draft`, contract revision 2 `Proposed`; design `Needs Revision`
- Requirement, behavior, acceptance-criteria, scenario or decision IDs affected: the contract's records (§2), cases D1–D7 and E1–E12, attribute check (§3), TC-1, TC-3 (now needs the user: it reverses the "detached, not listed" state of the earlier contract), TC-4, TC-5
- Scenario-basis or scenario-validity changes: none
- Why this baseline or revision was recorded: the contract changed materially against revision 1: the back-link has no `address`; a local link has no members; `hostRoot` is removed and a remote run's Task record names `nodeId` and `delegatingRun`; the link shape on disk does not change
- Canonical requirements, investigation and design sections changed: `target-collaboration-contract.md` rewritten; investigation notes "Data-level validation"; requirements Document Status and Supplemental Artifacts
- Supplemental artifacts added, changed or removed: `evidence/data-model-validation/validate_delegation_shapes.py`, `counts-2026-11-10.txt` added
- Product design evidence or product decisions incorporated: the earlier user decisions of 2026-10-17 kept (a deleted run's delegated runs are never deleted)
- Intended behavior changed: `Yes` (proposed)
- Approval impact, exact approved requirements baseline, who approved, and approval reference: nothing approved; the user's approval of contract revision 2 and of TC-1, TC-3, TC-4 is requested
- Behavior-defining supplement versions and approval references: `target-collaboration-contract.md` revision 2, `Proposed`
- Affected design/review basis invalidated or rebuilt: none
- Post-design task-size/risk classification and rationale changes: N/A
- Applied handoff-rule outcome / result-file reference, when a handoff occurred: none
- Downstream and architecture-review impact: none
- Remaining gaps, assumptions or blocked decisions: V-8 … V-12 of the contract (code readers, the Settings edit, the agent run's address file, the migration, the client); TC-1, TC-3, TC-4
- Next action: the user reviews contract revision 2; then requirements on the contract, architecture investigation (V-8 … V-12) and the design of this ticket's step
