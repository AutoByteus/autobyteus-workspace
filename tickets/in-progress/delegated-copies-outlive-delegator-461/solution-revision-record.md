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
| SR-007 | Requirements | The user's last contract decision (TC-3) | N/A | Requirements Draft; contract revision 2 proposed | Requirements Approved; contract revision 2 approved; design Needs Revision (to be replaced) | All REQ and AC (rewritten on the contract); REQ-011, REQ-012, AC-014, AC-015, BEH-010, BEH-011, SCN-009, SCN-010 new | Approved basis for the design of this ticket's step |
| SR-008 | Design | Architecture investigation of the contract's first step | N/A | Requirements Approved; design Needs Revision | Requirements Approved; design Draft (mechanism decided; file-level parts open) | D-1 … D-11 of `design-spec.md`; contract V-9 resolved, V-8, V-11, V-12 open | Design direction ready for the user; not ready for handoff |
| SR-009 | Design | The user's approval of the design direction; the open file-level parts closed | N/A | Design Draft | Design Ready; `Large` / `High` | D-8, D-10, D-11 refined; File-Level Completion C-1 … C-5; migration checklist | Architecture Design Complete |
| SR-010 | Mixed | Architecture review ARCH-REV-001 (Fail): AR-001 … AR-010 | AR-001 … AR-010 | Requirements Approved; design Ready | Requirements Approved with DEC-011 Ready for Approval; design Needs Revision (revised, waiting for DEC-011) | DEC-011 (new); REQ-005 (wording, if A); design RC-1 … RC-10, D-6, DS-004, DS-004b, DS-007, DS-008, the migration plan | Findings answered; one requirement decision for the user |
| SR-011 | Requirements | The user asked that communication be written into the contract | N/A | Contract revision 2 approved; DEC-011 open | Contract revision 3 proposed (§10 added); DEC-011 open, recommendation B | Contract §10 (M1 … M9, address order, delivery, lookup); DEC-011 | For the user's review and decision |
| SR-012 | Mixed | The user: a run is connected with its Task; closed Tasks need not stay in the collaboration tree; is the on-disk contract designed and validated? | N/A | Contract revision 3 proposed | Contract revision 4 proposed (§11 added) | Contract §11 (L1 … L11, what reads what, validation); DEC-011 (B, agreed in conversation, to confirm); TC-4 reopened by the user (teams and orgs in this ticket if it fits; not sized) | For the user's review |
| SR-013 | Requirements | The user's ordering decision: fix the growing collaboration tree first, as its own Task | N/A | Contract revision 4 proposed; design Needs Revision | Blocked: Waiting For Prerequisite PRE-001 | PRE-001 (new); every REQ waits | The prerequisite is sent to the Project Task Manager |
| SR-014 | Requirements (supplement) | PRE-001 delivered (`autobyteus-469`, verified Terminal 2026-11-11); the user: resume on the latest base and re-validate the contract | N/A | Blocked: Waiting For Prerequisite | Ready for Approval (contract revision 5 proposed; design Needs Revision) | Contract §1 … §12; TC-7 … TC-9; DEC-011 | Presented to the user |
| SR-015 | Design | Contract revision 5 with TC-7, TC-8, DEC-011 decided; the user: redesign and show it to him before any review | N/A | Design Needs Revision (SR-010) | Design Draft, for the user's review | DS-1 … DS-10 | Presented to the user; not sent to review |

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
- Remaining gaps, assumptions or blocked decisions: V-8 … V-12 of the contract (code readers, the Settings edit, the agent run's address file, the migration, the client); TC-1, TC-3, TC-4. Amended the same day: TC-6, the role value `delegated` is renamed `subWork` (the user)
- Next action: the user reviews contract revision 2; then requirements on the contract, architecture investigation (V-8 … V-12) and the design of this ticket's step

### SR-007 — Requirements approved on the contract

- Phase and classification: Requirements, `Refinement` completing the `Requirement Gap` of SR-004
- Triggering user feedback, Product package, investigation evidence, or role/report/round: the user, 2026-11-10: "I agree with your decision one and three" (TC-1, TC-4), `subWork` (TC-6), "I like your recommendation" (TC-3)
- Triggering finding IDs: N/A
- Prior authoritative requirements/design status: requirements `Draft`, contract revision 2 `Proposed` (SR-006); design `Needs Revision`
- Current authoritative requirements/design status: requirements `Approved` with the contract (revision 2, approved); design `Needs Revision` (the SR-003 spec is superseded and will be replaced)
- Requirement, behavior, acceptance-criteria, scenario or decision IDs affected: REQ-001 … REQ-010 restated for the contract; REQ-011, REQ-012 new; AC-004, AC-005, AC-008, AC-010, AC-012 restated; AC-014, AC-015 new; BEH-004, BEH-007 restated; BEH-010, BEH-011 new; SCN-009, SCN-010 new; UC-001 … UC-008 restated; DEC-002, DEC-003, DEC-005, DEC-009 superseded
- Scenario-basis or scenario-validity changes: SCN-009 (upgrade) and SCN-010 (a delegated run as a run) added, both Supported Normal Scenarios
- Why this baseline or revision was recorded: the approved basis for architecture design
- Canonical requirements, investigation and design sections changed: `requirements-doc.md` rewritten; contract status and TC-3; investigation notes; `follow-ups.md` (FU-003, FU-004, FU-005: the next steps)
- Supplemental artifacts added, changed or removed: none
- Product design evidence or product decisions incorporated: none
- Intended behavior changed: `Yes`, as approved
- Approval impact, exact approved requirements baseline, who approved, and approval reference: approved at SR-007: the user for the direction and TC-1, TC-3, TC-4, TC-6, DEC-001, DEC-010 (his words are in the requirements' Document Status); the Solution Designer within the direction for the rest, the user informed
- Behavior-defining supplement versions and approval references: `target-collaboration-contract.md` revision 2, approved by the user on 2026-11-10
- Affected design/review basis invalidated or rebuilt: the SR-003 design stays superseded
- Post-design task-size/risk classification and rationale changes: N/A until the new design
- Applied handoff-rule outcome / result-file reference, when a handoff occurred: none
- Downstream and architecture-review impact: none yet
- Remaining gaps, assumptions or blocked decisions: contract V-8 … V-12; ASM-003; the cut line of this step
- Next action: architecture investigation and the design of this ticket's step; the user approves the design before the build

### SR-008 — Design draft for the first step: local delegation through links

- Phase and classification: Design, `Design Impact` of SR-004 … SR-007
- Triggering user feedback, Product package, investigation evidence, or role/report/round: the approved requirements and contract (SR-007); investigation notes "Architecture investigation for the contract's first step"
- Triggering finding IDs: N/A
- Prior authoritative requirements/design status: requirements `Approved` (SR-007); design `Needs Revision` (the SR-003 spec, superseded)
- Current authoritative requirements/design status: requirements `Approved`; `design-spec.md` rewritten, status `Draft`
- Requirement, behavior, acceptance-criteria, scenario or decision IDs affected: none of the requirements; design decisions D-1 … D-11
- Scenario-basis or scenario-validity changes: none
- Why this baseline or revision was recorded: the mechanism and the cut line are decided: a standalone root delegates through links only; a channel for this node; the link machinery renamed; the Task record's `hostRoot` kept with one meaning until nothing is hosted; one startup migration
- Canonical requirements, investigation and design sections changed: `design-spec.md` (new content); investigation notes F-1 … F-6
- Supplemental artifacts added, changed or removed: none
- Product design evidence or product decisions incorporated: none
- Intended behavior changed: `No`
- Approval impact, exact approved requirements baseline, who approved, and approval reference: requirements unchanged (SR-007); the user's approval of the design is pending
- Behavior-defining supplement versions and approval references: contract revision 2 (approved)
- Affected design/review basis invalidated or rebuilt: the SR-003 design is replaced
- Post-design task-size/risk classification and rationale changes: provisional `Large` / `High`; final when the open parts are closed
- Applied handoff-rule outcome / result-file reference, when a handoff occurred: none
- Downstream and architecture-review impact: none yet
- Remaining gaps, assumptions or blocked decisions: the spec's OPEN items (reader list V-8, history index files, web file list, released-migration repoint list V-11, the inbound receiver's placement, GraphQL and stream shape changes)
- Next action: the user approves the design direction; the open parts are closed; then the handoff by the handoff rules

### SR-009 — Design complete for the first step; the user approved the direction

- Phase and classification: Design, `Refinement`
- Triggering user feedback, Product package, investigation evidence, or role/report/round: the user, 2026-11-10: "I think that makes sense what you have proposed" (the design direction; a delegated run's model in its own Settings); the searches recorded in the investigation notes
- Triggering finding IDs: N/A
- Prior authoritative requirements/design status: requirements `Approved` (SR-007); design `Draft` (SR-008)
- Current authoritative requirements/design status: requirements `Approved` (SR-007); `design-spec.md` `Ready`
- Requirement, behavior, acceptance-criteria, scenario or decision IDs affected: none of the requirements; D-8 (nested rows from the delegating run's view of its links; top-level lists leave linked runs out), D-10 (confirmed by the user), D-11; C-1 … C-5; the Data Migration Guideline checklist
- Scenario-basis or scenario-validity changes: none
- Why this baseline or revision was recorded: the design is complete and approved in direction
- Canonical requirements, investigation and design sections changed: `design-spec.md` (status, approval, File-Level Completion, migration checklist, D-8, D-11); investigation notes
- Supplemental artifacts added, changed or removed: none
- Product design evidence or product decisions incorporated: none
- Intended behavior changed: `No`
- Approval impact, exact approved requirements baseline, who approved, and approval reference: requirements at SR-007 unchanged; design direction approved by the user on 2026-11-10 (his words are in the design spec's approval basis)
- Behavior-defining supplement versions and approval references: contract revision 2 (approved)
- Affected design/review basis invalidated or rebuilt: none (no review has run)
- Post-design task-size/risk classification and rationale changes: `Large` / `High`: several subsystems, an ownership-boundary change, a migration of existing runs, wire and stored renames
- Applied handoff-rule outcome / result-file reference, when a handoff occurred: see `handoff-architecture-design-complete.md`
- Downstream and architecture-review impact: independent architecture review before implementation
- Remaining gaps, assumptions or blocked decisions: the design is from reading, not running; the file lists come from searches and are re-run by the implementation; internals read in part are named in the investigation notes
- Next action: the handoff by the handoff rules

### SR-010 — Revision after architecture review round 1 (ARCH-REV-001)

- Phase and classification: Mixed. `Design Impact` for AR-001, AR-003 … AR-010; `Requirement Gap` for AR-002 (the reviewer's own condition: a route that cannot be served through links is escalated)
- Triggering user feedback, Product package, investigation evidence, or role/report/round: `design-review-report.md`, architecture review round 1, ARCH-REV-001, Fail, against SR-009
- Triggering finding IDs: AR-001, AR-002, AR-003, AR-004, AR-005, AR-006, AR-007, AR-008, AR-009, AR-010
- Prior authoritative requirements/design status: requirements `Approved` (SR-007); design `Ready` (SR-009)
- Current authoritative requirements/design status: requirements `Approved` at SR-007 with DEC-011 `Ready for Approval`; design `Needs Revision`: revised (RC-1 … RC-10), becomes `Ready` when DEC-011 is decided
- Requirement, behavior, acceptance-criteria, scenario or decision IDs affected: DEC-011 (new, needs the user); REQ-005 and the contract's message-scope row (reworded only if DEC-011 = A); ASM-003 closed; design D-6, DS-004, DS-004b (new), DS-007, DS-008, BEH-005 and BEH-006 map rows, the migration plan (E3a, E3b, E3c, the busy-run record)
- Scenario-basis or scenario-validity changes: none
- Why this baseline or revision was recorded: a failed review
- Canonical requirements, investigation and design sections changed: `design-spec.md` (status; the rows and spines named above; "Review Corrections (ARCH-REV-001)"); `requirements-doc.md` (status, DEC-011, ASM-003); `investigation-notes.md` (status, supplement inventory, the review investigation)
- Supplemental artifacts added, changed or removed: three read-only measurement scripts and their results in `evidence/data-model-validation/`
- Product design evidence or product decisions incorporated: none
- Intended behavior changed: `No` for nine findings; DEC-011 proposes one change (option A) and is not applied until the user decides
- Approval impact, exact approved requirements baseline, who approved, and approval reference: SR-007 stays the approved baseline; DEC-011 needs the user's answer
- Behavior-defining supplement versions and approval references: contract revision 2 (approved); its message-scope row follows DEC-011
- Affected design/review basis invalidated or rebuilt: the review of SR-009 stands as round 1; the revised spec needs a new round
- Post-design task-size/risk classification and rationale changes: unchanged, `Large` / `High`
- Applied handoff-rule outcome / result-file reference, when a handoff occurred: none yet (waiting for DEC-011)
- Downstream and architecture-review impact: architecture review round 2 after DEC-011
- Remaining gaps, assumptions or blocked decisions: DEC-011
- Next action: the user decides DEC-011; the spec's D-6 and RC-2 are finalized; the package returns to architecture review

### SR-011 — Contract revision 3 (proposed): §10 Communication

- Phase and classification: Requirements, `Refinement`
- Triggering user feedback, Product package, investigation evidence, or role/report/round: the user, 2026-11-10: "how communication works should also be written down in the contract … In the past, did we have that?"; his questions on DEC-011
- Triggering finding IDs: AR-002 (architecture review round 1) led to DEC-011
- Prior authoritative requirements/design status: requirements `Approved` (SR-007) with DEC-011 `Ready for Approval`; contract revision 2 approved; design `Needs Revision` (SR-010)
- Current authoritative requirements/design status: the same; contract revision 3 `Proposed` (§1 … §9 unchanged and approved; §10 new)
- Requirement, behavior, acceptance-criteria, scenario or decision IDs affected: contract §10 (routes M1 … M9, the address order, what a delivery does, how a receiver is found); DEC-011 (recommendation changed from A to B, with the reason)
- Scenario-basis or scenario-validity changes: none
- Why this baseline or revision was recorded: the contract did not state communication beyond two rows; the user asked for it
- Canonical requirements, investigation and design sections changed: `target-collaboration-contract.md` §10 and status; requirements DEC-011; investigation notes "Communication"
- Supplemental artifacts added, changed or removed: none
- Product design evidence or product decisions incorporated: none
- Intended behavior changed: `No` under B; under A, M4, M5 and the third address step are removed
- Approval impact, exact approved requirements baseline, who approved, and approval reference: §10 and DEC-011 need the user's answer; SR-007 stays the approved baseline for the rest
- Behavior-defining supplement versions and approval references: contract revision 2 approved; revision 3 proposed
- Affected design/review basis invalidated or rebuilt: design D-6 and RC-2 follow DEC-011
- Post-design task-size/risk classification and rationale changes: unchanged
- Applied handoff-rule outcome / result-file reference, when a handoff occurred: none
- Downstream and architecture-review impact: review round 2 after DEC-011
- Remaining gaps, assumptions or blocked decisions: DEC-011
- Next action: the user reads §10 and decides DEC-011

### SR-012 — Contract revision 4 (proposed): §11 The life of a link

- Phase and classification: Mixed (requirements and evidence), `Refinement`
- Triggering user feedback, Product package, investigation evidence, or role/report/round: the user, 2026-11-10: "the agent or agent team is connected with the task"; "we don't have to really keep all those task agent or agent teams into the collaboration tree"; "have you already designed the on disk contract with every case described and then validate by yourself?"; also: teams and organizations in this ticket if it fits; what about temporary Tasks
- Triggering finding IDs: N/A
- Prior authoritative requirements/design status: requirements `Approved` (SR-007) with DEC-011 open; contract revision 3 proposed; design `Needs Revision` (SR-010)
- Current authoritative requirements/design status: unchanged, with contract revision 4 `Proposed`
- Requirement, behavior, acceptance-criteria, scenario or decision IDs affected: contract §11 (new rule: a link exists while a Task of its run is open; the Task's record is the lasting record); contract §2.2, §3, §5, §6, §8 where they keep a link for good (to be rewritten on approval); DEC-011 = B (the lookup §11 needs); TC-4 (reopened by the user, not decided); a new decision to record on temporary Tasks (no timer, recommended)
- Scenario-basis or scenario-validity changes: none yet
- Why this baseline or revision was recorded: the user's direction changes the stored model's rule for links
- Canonical requirements, investigation and design sections changed: `target-collaboration-contract.md` §11 and status; investigation notes
- Supplemental artifacts added, changed or removed: `evidence/data-model-validation/validate_task_record_as_lasting_record.py`, `task-record-validation-2026-11-10.txt`
- Product design evidence or product decisions incorporated: none
- Intended behavior changed: `Yes` (proposed): the delegating run's tree lists only runs whose Task is open, which is what the user sees today (closed runs are hidden), now also in the stored list
- Approval impact, exact approved requirements baseline, who approved, and approval reference: nothing newly approved; the user's confirmation of §10 (DEC-011) and §11, and his decisions on scope (teams and orgs) and temporary Tasks are requested
- Behavior-defining supplement versions and approval references: contract revision 2 approved; revisions 3 and 4 proposed
- Affected design/review basis invalidated or rebuilt: the design (SR-010) must be rewritten on revision 4 (the closed-set handling of RC-1 goes; the location consumers of RC-3 read the Task's records; the migration drops closed links); review round 2 afterwards
- Post-design task-size/risk classification and rationale changes: N/A until the redesign
- Applied handoff-rule outcome / result-file reference, when a handoff occurred: none
- Downstream and architecture-review impact: none until the redesign
- Remaining gaps, assumptions or blocked decisions: the user's confirmation; the sizing of team and org runs
- Next action: the user reviews §10 and §11 and answers the two open questions (teams and orgs; temporary Tasks)

### SR-013 — Waiting for prerequisite PRE-001 (the user's ordering)

- Phase and classification: Requirements, a prerequisite by the user's decision
- Triggering user feedback, Product package, investigation evidence, or role/report/round: the user, 2026-11-10: fix the constantly growing collaboration tree first, on the current structure, then come back to this ticket; ask the Project Task Manager to create the Task and work on it first
- Triggering finding IDs: N/A
- Prior authoritative requirements/design status: requirements `Approved` (SR-007) with open deltas (DEC-011; contract revisions 3 and 4 proposed); design `Needs Revision` (SR-010)
- Current authoritative requirements/design status: `Blocked`, `Waiting For Prerequisite` PRE-001; nothing else changed
- Requirement, behavior, acceptance-criteria, scenario or decision IDs affected: PRE-001; the contract's §11 and §12 become the rules of the prerequisite Task
- Scenario-basis or scenario-validity changes: none
- Why this baseline or revision was recorded: the ticket stops until the prerequisite is delivered
- Canonical requirements, investigation and design sections changed: requirements Document Status and Prerequisites; `handoff-waiting-for-prerequisite.md`
- Supplemental artifacts added, changed or removed: `handoff-waiting-for-prerequisite.md`
- Product design evidence or product decisions incorporated: none
- Intended behavior changed: `No`
- Approval impact, exact approved requirements baseline, who approved, and approval reference: unchanged; when the ticket continues, the requirements and the contract are revised on the delivered prerequisite and the user's open decisions (DEC-011, scope for team and org runs, temporary Tasks) are taken up again
- Behavior-defining supplement versions and approval references: contract revision 2 approved; revisions 3 and 4 proposed
- Affected design/review basis invalidated or rebuilt: the design is rebuilt after the prerequisite; architecture review round 2 then
- Post-design task-size/risk classification and rationale changes: N/A
- Applied handoff-rule outcome / result-file reference, when a handoff occurred: no rule for a blocked result; sent to `/project_task_manager` with `handoff-waiting-for-prerequisite.md`
- Downstream and architecture-review impact: none until the ticket continues
- Remaining gaps, assumptions or blocked decisions: the prerequisite Task's key
- Next action: the Project Task Manager creates the Task and gives it to this team; this ticket continues when it is delivered

### SR-014 — Resumed on the 469 base; contract revision 5

- Phase and classification: Requirements (behavior-defining supplement), `Requirement Change` driven by a changed base
- Triggering user feedback, Product package, investigation evidence, or role/report/round: PRE-001 delivered (`827f1e68dc`); the user, 2026-11-11: "your current ticket should be based on the latest version … re-investigate and then update the data model and the other contract", and "for this ticket we need to build on top of the other one … and start to validate our contract once again"
- Triggering finding IDs: N/A
- Prior authoritative requirements/design status: Blocked, Waiting For Prerequisite; requirements approved at SR-007 with contract revision 2; revisions 3 and 4 proposed
- Current authoritative requirements/design status: requirements `Ready for Approval` with contract revision 5 proposed; design `Needs Revision` (rebuilt after approval)
- Requirement, behavior, acceptance-criteria, scenario or decision IDs affected: the contract's principles P2, P3, records §2, attributes §3, existing data §5, operations §6, validation §7, simulations §8, decisions TC-7 … TC-9, communication §10, §11, §12; DEC-011 unchanged and still open
- Scenario-basis or scenario-validity changes: none
- Why this baseline or revision was recorded: the branch was rebased onto `827f1e68dc` and the contract was re-validated against that code and the user's current data (notes "Re-investigation after autobyteus-469"). 469 removed the link revision 2 relied on and made the Task record the index of delegated runs, so revision 2's two-ended relationship would now be a second copy. Revision 5 stores the relationship once, in the Task entry (`delegatedBy`, one hop), removes the standalone tree file, and moves every peer-run fact into the Task entry. Revisions 3 and 4 are folded in and rewritten on that base.
- Canonical requirements, investigation and design sections changed: `target-collaboration-contract.md` (revision 5); `requirements-doc.md` status lines; `investigation-notes.md` new section
- Supplemental artifacts added, changed or removed: `evidence/data-model-validation/validate_contract_after_469.py`, `contract-after-469-2026-11-11.txt`, `validate_relationship_in_task_record.py`, `relationship-in-task-record-2026-11-11.txt`
- Product design evidence or product decisions incorporated: none
- Intended behavior changed: `Yes` (proposed): the 15 old runs without a Task record appear in the run list (TC-9); otherwise the stored model only
- Approval impact, exact approved requirements baseline, who approved, and approval reference: not approved; the user decides TC-7, TC-8, TC-9 and DEC-011
- Behavior-defining supplement versions and approval references: contract revision 5, proposed
- Affected design/review basis invalidated or rebuilt: the design of SR-010 and its review ARCH-REV-001 apply to revision 2 and are rebuilt after approval
- Post-design task-size/risk classification and rationale changes: N/A until the design is rebuilt
- Applied handoff-rule outcome / result-file reference, when a handoff occurred: none (approval hold in the Solution Designer's conversation)
- Downstream and architecture-review impact: a new design and review round after approval
- Remaining gaps, assumptions or blocked decisions: TC-7, TC-8, TC-9, DEC-011; V-10 … V-14 in the design
- Next action: the user's decisions
- Update 2026-11-11 (same round): the user decided TC-8. Quote: "do you think it's better to put the node information on the task itself … If it's put there, do you think it's even possible to remove this collaboration tree on JSON on the disk completely?", and after the answer, "Yeah, I mean the … agent run resource file". The node and members of a peer's run go into its entry in `agent_run_resources.json`; the standalone `collaboration_tree.json` is removed. TC-7, TC-9 and DEC-011 remain open.
- Update 2026-11-11 (same round): the user approved the Task-centered approach. Quotes: "So you mean now we don't use the hosting or the routing strategy will be centered around the task itself?"; on the explanation "the product team may message the manager because it is doing part of the manager's Task, not because it is running inside the manager's process", "I think that's a very, very good explanation"; "let's go with this approach … always make sure that you start with the data model and validate your data model first. And after that, you do design … don't send for review immediately, I want to review it myself first". Recorded: TC-7 and DEC-011 decided (contract §9); DEC-012 decided by the Solution Designer; §10 and §12 rewritten; validated on every stored message between two runs (`evidence/data-model-validation/task-centered-messaging-2026-11-11.txt`: 1,540 of 1,604 allowed as today; the 64 others all involve legacy runs without a Task record; 0 newly allowed). TC-9 remains open. The design is rebuilt next and goes to the user before any review.

### SR-015 — New design draft on the 469 base, for the user's review

- Phase and classification: Design, `Design Rebuilt` (draft)
- Triggering user feedback: 2026-11-11, "What is your data flow span in this case … Do we still keep the standalone like a roots? … after you redesign … don't send for review immediately, I want to review it myself first. Yeah, always make sure that you start with the data model and validate your data model first. And after that, you do design"
- Triggering finding IDs: the open findings of ARCH-REV-001 (AR-001 … AR-010) on SR-010, answered in the new design's table
- Prior authoritative requirements/design status: requirements Ready for Approval (TC-9 open); design Needs Revision (SR-010)
- Current authoritative requirements/design status: requirements unchanged; design `Draft — for the user's review`
- Requirement, behavior, acceptance-criteria, scenario or decision IDs affected: none in the requirements
- Scenario-basis or scenario-validity changes: none
- Why this baseline or revision was recorded: the data model (contract revision 5) was validated first, including the Task-centered message rule on every stored message. The design follows it. Every run becomes its own root, as runs started by a peer already are. The Task record decides views and messages. Delegations from team and org runs stay hosted until their Tasks (TC-4).
- Canonical requirements, investigation and design sections changed: `design-spec.md` rewritten
- Supplemental artifacts added, changed or removed: none
- Product design evidence or product decisions incorporated: none
- Intended behavior changed: `No` (the design realizes the contract)
- Approval impact: the user reviews the draft; no handoff before his answer
- Behavior-defining supplement versions and approval references: contract revision 5
- Affected design/review basis invalidated or rebuilt: SR-010's design and its review round are superseded
- Post-design task-size/risk classification and rationale changes: `Large`, `High` (draft)
- Applied handoff-rule outcome / result-file reference: none, at the user's request
- Downstream and architecture-review impact: architecture review after the user's review and the next revision (V-10, V-11, V-14, U-A, U-B)
- Remaining gaps, assumptions or blocked decisions: TC-9; V-10, V-11, V-14, U-A, U-B
- Next action: the user's review
