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
| SR-016 | Design | The user: names by ownership; finish the open items, then stop for his review | N/A | Design Draft (SR-015) | Design Draft, for the user's review | DS-1 … DS-10; V-10, V-11, V-14, U-A, U-B | Presented to the user; not sent to review |
| SR-017 | Requirements and design | The user widens the scope: team and org runs in this ticket (TC-4 revised) | N/A | Design Draft (SR-016) | Requirements Ready for Approval; design Draft, for the user's review | REQ-001, REQ-002, REQ-010, REQ-011, BEH-002, BEH-004, AC-006, AC-012, SCN-002; TC-4 | Presented to the user; not sent to review |
| SR-018 | Requirements and design | The user: validate the data model and the design yourself, then send to architecture review (approval given) | N/A | Requirements Ready for Approval; design Draft | Requirements Approved; design Ready | DS-11, migration step 8, the Task page's locator | Architecture review ARCH-REV-002: Fail (AR-004, AR-005, AR-008, AR-011 … AR-015) |
| SR-019 | Design (and requirement wording) | Architecture review ARCH-REV-002 (round 2) on SR-018 | AR-004, AR-005, AR-008, AR-011, AR-012, AR-013, AR-014, AR-015 | Design Ready, review Fail | Design Ready | REQ-005, REQ-009 (wording); DS-1, DS-2, DS-8, DS-9, DS-10 | Architecture review ARCH-REV-003: Fail (AR-005, narrowed) |
| SR-020 | Design | Architecture review ARCH-REV-003 (round 3) on SR-019 | AR-005 (narrowed); residual | Design Ready, review Fail | Design Ready | DS-10; `TaskRunIndex` | Architecture review ARCH-REV-004: Fail (AR-005, narrowed again) |
| SR-021 | Design | Architecture review ARCH-REV-004 (round 4) on SR-020 | AR-005 (narrowed) | Design Ready, review Fail | Design Ready | DS-10 | Architecture review ARCH-REV-005 (round 5): Pass, no open findings; then reopened by the user (SR-022) |
| SR-022 | Requirements (supplement) and design | The user, after the round-5 pass (implementation stopped by the user): the run keeps its own `delegatedFrom`; an in-memory structure of the relationships for communication | N/A | Requirements Approved (rev 5); design Ready, review Pass | Contract revision 6; design Ready (SR-022) | Contract P2, §2.2, §2.4, §2.6, §3, E6, §6, V-15 … V-18, §8, TC-10, TC-11, §9.2, §10.5; design | Architecture review ARCH-REV-006: Fail (AR-016, AR-017) |
| SR-023 | Requirements (supplement: examples) and design | Architecture review ARCH-REV-006 on SR-022; the user asked for JSON of every case | AR-016, AR-017 | Design Ready, review Fail | Design Ready | Contract §2.4, §2.6, §13 (new); design readers table, ordering, DS-10, tests | Architecture review ARCH-REV-007 (round 7): Pass, no open findings |
| SR-024 | Requirements (supplement) and design | Implementation Engineer, Design Impact (Unclear): the shape of a delegated team run's file | N/A | Design Ready, review Pass (ARCH-REV-007) | Design Ready (SR-024) | Contract §2.2, E6 (team), §9 TC-12, V-19; design `DelegatedRunStarter`, DS-10 step 4, removal plan, tests | Narrow architecture review |

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
- Update 2026-11-11 (same round): the user decided TC-9: "if they are not associated with task yes i think they are just normal runs". The 15 delegated runs without a Task record become ordinary runs in the run list. All contract decisions are now taken; the user's review of the design draft is pending.
- Update 2026-11-11 (same round): the user decided TC-10 (contract §9) and agreed to an in-memory delegation index. The Task entry's field is renamed `delegatedFrom` (`{ delegatingRun, delegatorAgentRunId }`), the same name and shape as a peer-started run's own record; a local delegated run's own file carries no copy, because the copy would disagree with the Task once the Task is deleted, and a run whose Task is deleted is an ordinary run. Principle P6 now states that a run's life is bound to its Task, never to the run that delegated it (the user: "you are not deciding the life circle of the other person … The life circle is bound to tasks, not bound by the manager"). Design: `DelegationIndex` added (in memory, built from the Task records at startup, owns no run); `TaskCommunicationScope` asks it. Contract §6 gains "Delete a Task".

### SR-016 — Design draft completed for the user's review

- Phase and classification: Design, `Design Rebuilt` (draft, completed)
- Triggering user feedback: 2026-11-11, "naming is extremely important … we create a naming based on ownership … the bigger direction is okay … After you finish your work, then tell me stop there and then I will review myself as well"; on the index, "who is the owner of this delegation index? … or it's just simply a global one"
- Triggering finding IDs: the open items of SR-015 (V-10, V-11, V-14, U-A, U-B)
- Prior authoritative requirements/design status: requirements with every contract decision taken; design draft SR-015
- Current authoritative requirements/design status: requirements unchanged (DEC-011 row updated to the decision); design `Draft — for the user's review`
- Requirement, behavior, acceptance-criteria, scenario or decision IDs affected: DEC-011 row in the requirements (record only)
- Scenario-basis or scenario-validity changes: none
- Why this baseline or revision was recorded: names follow their owners. `DelegationIndex` is replaced by four questions on the Task side's port, with a private `TaskRunIndex` if the service needs the split. `TaskCommunicationScope` became `TaskMessageScope` (the existing "Task-linked message scope"); `StandaloneTaskDelegation` became `TaskDelegation` (root-neutral); `IndependentRunStarter` became `DelegatedRunStarter`; the two idle shutdowns are renamed for what they serve. The open items are settled in the design:
  - ordering without the shared queue: the Task side orders the record, each run's gate orders the run, with a re-check at the gate head;
  - every reader of the removed or renamed fields, with a decision per area;
  - V-11, from `delegated-copy-model-change`'s design;
  - V-14;
  - the web: a local delegated run is shown like a remote child.
- Canonical requirements, investigation and design sections changed: `design-spec.md` rewritten; `requirements-doc.md` DEC-011 row
- Supplemental artifacts added, changed or removed: none
- Product design evidence or product decisions incorporated: none
- Intended behavior changed: `No`
- Approval impact: the user reviews the draft; no handoff before his answer
- Behavior-defining supplement versions and approval references: contract revision 5, all decisions taken by the user
- Affected design/review basis invalidated or rebuilt: SR-015's draft
- Post-design task-size/risk classification and rationale changes: `Large`, `High`
- Applied handoff-rule outcome / result-file reference: none, at the user's request
- Downstream and architecture-review impact: architecture review after the user's review
- Remaining gaps, assumptions or blocked decisions: none open in the requirements; the user's review
- Next action: the user's review

### SR-017 — Team and org runs in this ticket (TC-4 revised)

- Phase and classification: Requirements (scope change by the user) and Design
- Triggering user feedback: 2026-11-11, "I think we can do the agent team and agent organization in this task as well. We don't have to separate because it's kind of not so easy to have like intermediary states."
- Prior status: design draft SR-016 (standalone delegations only)
- Current status: requirements `Ready for Approval` (the user's review of the design pending); design `Draft — for the user's review`
- Affected IDs: REQ-001 (Stop of any run stops that run only), REQ-002, REQ-010 (now: application-owned termination and the inside of a team or org run unchanged), REQ-011; BEH-002, BEH-004; AC-006 (restored for team and org runs), AC-012; SCN-002; contract TC-4; follow-ups FU-003 … FU-005 withdrawn
- Why: the user does not want the in-between state with two models. The design's scope, size, ordering consequence, removal plan, change sequence and risks now cover the three root kinds and remove all hosting machinery.
- Intended behavior changed: `Yes` (approved by the user's decision): Stop of a team run or org run stops its own members only.
- Approval impact: the user decided TC-4; his approval of the package follows his review
- Applied handoff-rule outcome: none, at the user's request
- Next action: the user's review

### SR-018 — Self-validated, approved by the user, to architecture review

- Phase and classification: Requirements approval and Design (self-validation)
- Triggering user feedback: 2026-11-11, "please validate by yourself and whether the design specification works, validate by yourself and whether the data model is very very important because data model somehow decides how clean your upper layer implementation will be … After validation by yourself to work, you will send to the review by yourself. Yeah. I think you'll get an approval from me. You sent your architecture reviewer to review."
- Prior status: requirements Ready for Approval; design Draft (SR-017)
- Current status: requirements `Approved` with contract revision 5; design `Ready`
- What the validation did: read-only checks of the data model against every spine (`evidence/data-model-validation/validate_spines_on_data.py`, `spines-on-data-2026-11-11.txt`) and a walk of every spine against the model (design spec "Self-Validation").
- What it found and changed: delegated runs have no history rows (0 of 196), while an ordinary run needs one (the stopped-run Settings save refuses a run without one). Added DS-11 (the run list, decided with the Task side) and migration step 8 (a history row per delegated run). The Task page's locator wording is corrected (it opens the delegating run with the row selected). No other gap.
- Intended behavior changed: `No`
- Approval: the user, as quoted; recorded in `requirements-doc.md`, the contract status and the design's approval basis
- Classification: `Large`, `High`
- Applied handoff-rule outcome: see `handoff-architecture-design-complete.md`
- Next action: architecture review

### SR-019 — Answers to architecture review round 2

- Phase and classification: Design, `Design Impact` resolved; requirement wording (AR-015) with no change of intended behavior
- Triggering report: `design-review-report.md`, `architecture-review-revision-record.md`, ARCH-REV-002, decision `Fail`
- Triggering finding IDs: AR-004, AR-005, AR-008 (narrowed from round 1); AR-011 … AR-015 (new); residuals
- Prior status: requirements Approved; design Ready (SR-018), reviewed Fail
- Current status: requirements Approved (wording corrected); design Ready (SR-019)
- What changed (each answered in the design's table "Round 2"):
  - **DS-10 (AR-005):** declares its four prerequisite migrations; preserves the released partial states of `20261017_task_agent_own_run_v1` (a tree holding a non-link entry or a link without an own file is left untouched and reported); states how each step is recognized as done on retry, the order, the Guideline §2 checklist and the fixtures.
  - **DS-8 (AR-011, AR-008):** a view's commands to a local child go to the child's own root through `DelegatedRunCommands`, tool approval included; the stream connect no longer starts the host, for all three stream kinds.
  - **DS-9 (AR-004):** the restart notice lists the resumed runs a run delegated, from the Task side.
  - **DS-2 (AR-013):** the receiver's root writes its log, then the sender's root writes its own, as the peer path does, with the failure outcomes.
  - **Readers table (AR-012):** team, org and standalone token totals cover the runs delegated from them, recursively, from the Task entries. The results are unchanged, so this is not a Requirement Gap; REQ-009 now says so.
  - **Ownership Map (AR-014):** the Task side's index maps every agent of every run named as a `delegatingRun`; org roots named.
  - **Requirements (AR-015):** supplements, follow-ups, scenarios, REQ-005, REQ-009, unknowns and ASM-003 corrected.
  - **Residuals:** DS-1 states the role and the owned-sender refusal and the history row at creation; the team gate is named.
- Intended behavior changed: `No`
- Approval impact: none (within the approved requirements; REQ-009's wording makes explicit what "keeps working" covers)
- Classification: `Large`, `High`, unchanged
- Applied handoff-rule outcome: back to `/software_engineering_team/architecture_reviewer`
- Next action: architecture review, round 3

### SR-020 — Every Task entry is converted, also a preserved run's

- Phase and classification: Design, `Design Impact` resolved
- Triggering report: `design-review-report.md`, ARCH-REV-003, decision `Fail`, one finding
- Triggering finding IDs: AR-005 (narrowed); one non-blocking residual
- Prior status / current status: design Ready (SR-019), reviewed Fail → design Ready (SR-020); requirements Approved, unchanged
- What changed:
  - **DS-10 (AR-005):** SR-019 left a preserved run's Task entries in the old shape. A Task file is parsed strictly per entry, so one old entry would have damaged the whole Task and dropped its other runs. Route (a): step 1 converts every entry; a preserved run's `delegatedFrom` comes from its kept full record (frozen reader), else `assignedBy` and today's `hostRoot`. Only the preserved run's own file and its tree stay untouched. Checklist item 4 and a fixture (a Task with a preserved run beside converted ones) are added.
  - **Residual:** `TaskRunIndex` re-reads the org runs' own files on a lookup miss, because an org can materialize a mounted team with new member run IDs later.
- Intended behavior changed: `No`
- Classification: `Large`, `High`, unchanged
- Applied handoff-rule outcome: back to `/software_engineering_team/architecture_reviewer`
- Next action: architecture review, round 4

### SR-021 — No prerequisite hold; a predecessor's unfinished items are preserved

- Phase and classification: Design, `Design Impact` resolved
- Triggering report: `design-review-report.md`, ARCH-REV-004, decision `Fail`, AR-005 narrowed again. The reviewer corrected its own round-2 recommendation of the hold.
- Prior status / current status: design Ready (SR-020), reviewed Fail → design Ready (SR-021); requirements Approved, unchanged
- What changed: the Solution Designer traced the status rule of each of the four predecessor migrations. Each records `FAILED` as soon as one item fails and is retried at every start, and none reads Task records. A hold on them could keep this migration from ever running, and with a runtime that reads only the target shape that is a node-wide lockout. DS-10 now:
  - declares no prerequisites and is registered after the four;
  - always converts every Task entry;
  - preserves each predecessor's unfinished items per item, with a warning (a table per predecessor);
  - describes what happens when a predecessor finishes an item later;
  - states availability in checklist item 2;
  - adds tests for each predecessor `FAILED` and for a later finish.

  Route (a) of the review, extended to all four predecessors.
- Intended behavior changed: `No`
- Classification: `Large`, `High`, unchanged
- Applied handoff-rule outcome: back to `/software_engineering_team/architecture_reviewer`
- Next action: architecture review, round 5
- Review result (recorded 2026-11-11, informational): `Pass`, ARCH-REV-005, round 5, on SR-021 (`design-review-report.md`, `architecture-review-revision-record.md`, both the reviewer's). AR-001 … AR-015 resolved. The reviewer verified that `runPending` continues past failed migrations (`app-data-migration-runner.ts:79-100`), that `20261019_…` reads coordinating trees only for configured-place copies of team and org runs, and that no predecessor holds back a capability. The reviewer delivered the handoff to `/software_engineering_team/implementation_engineer`; the Solution Designer sends none.

### SR-022 — Contract revision 6: the run's own `delegatedFrom` and the `DelegationTree`

- Phase and classification: Requirements (behavior-defining supplement, the user's decisions) and Design
- Triggering user feedback (2026-11-11, after ARCH-REV-005 passed; the user stopped the Implementation Engineer):
  - "it's very reasonable to think that, OK, I was earlier delegated by someone else, it's reasonable to put that information on my side … that's not like a duplicate … it's just like more symmetric information"
  - "there should be a in-memory stuff, just like the earlier standalone … root stuff, but it behaves already like a different purpose. It was only trying to host the relationship there, so which helps with the communicating"
  - "Please continue to refine your data contract … until you refine the complete contract validated by yourself again"
  - and, on the old root: "there's a lookup tree … they provide a policy how communication can happen … it behaves very much like one in-memory version of … what user can see … under the front end"
- Prior status: requirements Approved with contract revision 5; design Ready (SR-021), architecture review Pass (ARCH-REV-005)
- Current status: contract revision 6 (the user's direction); design Ready (SR-022); architecture review to repeat
- What changed:
  - **Contract.** P2: `delegatedFrom` is stored on the delegated run (its origin, written once) and on each Task entry (the assignment), with the same name and shape, equal by rule. The delegating run stores nothing; its side is in memory. §2.2 gives the run's `delegatedFrom` with its fields and readers. §2.4: a peer-started run is the same with `nodeId`. New §2.6: the `DelegationTree`. §3, E6, §6, §8 (S16, S17), §9.2, §10.5 and §11 L1 are updated. TC-10 revised and TC-11 decided by the user.
  - **Design.** The `DelegationTree` (collaboration) replaces the Task-side lookup questions and `TaskRunIndex`. It owns the communication rule (`canMessage`) and feeds the views, so what the user sees and who can talk come from one structure. `TaskMessageScope` becomes `CrossRunMessageDelivery`, named for what it owns: the order of one message between two runs. Migration step 4 writes the run's `delegatedFrom`. The readers table gains the run's `delegatedFrom`.
- Validation: `evidence/data-model-validation/validate_contract_revision_6.py`, `contract-revision-6-2026-11-11.txt` (read-only):
  - origins computed for 196 of 196 runs;
  - equal to every Task entry for 181 of 181;
  - the tree is a forest (183 nodes, 0 cycles, every chain ends at a stored run);
  - the message rule on the tree equals the rule on the records for 230 of 230 pairs.
- Intended behavior changed: `No` for agents and the UI (the run list gains a "delegated from" label for runs whose Task is gone, from TC-9 and TC-3)
- Approval impact: the user's decisions TC-10 (revised) and TC-11, as quoted
- Classification: `Large`, `High`, unchanged
- Next action: the user's go-ahead, then architecture review (the earlier pass covered revision 5)

### SR-023 — Answers to round 6; every case as JSON in the contract

- Phase and classification: Design, `Design Impact` resolved; the contract gains examples, with no change of rules (§2.4 names the peer test)
- Triggering: `design-review-report.md`, ARCH-REV-006, `Fail` (AR-016, AR-017); the user, 2026-11-11: "show me the contract file again … for each case, like there's a JSON stuff like that for each case … this makes us able to see the exact data itself"
- What changed:
  - **AR-016:** at `827f1e68dc`, several readers treat the presence of `delegatedFrom` as "started by a peer". Two named tests now: `isDelegated` (present) and `isPeerStarted` (`nodeId` present). The readers table decides per reader:
    - peer endpoint, peer channel and runtime-switch exclusion: `isPeerStarted` only;
    - idle shutdowns: `isDelegated`;
    - the stored message view's back-link and `storedBackLink`: removed (469's view rule needs none).
    - Tests are added. The contract's §2.4 states the test.
  - **AR-017:** the tree is updated synchronously inside the Task's ordered change, before it resolves, from the Task side's memory. The gate-head re-check reads the Task side's port, which is the authority. An interleaving test is added. The contract's §2.6 says the same.
  - **The contract's new §13, "Every case as data":** exact JSON for every delegation case (D1 … D8: the Task entry, the delegated run's own file, the in-memory tree node) and for every stored shape before and after the migration (E1 … E10, and a preserved partial state). Found while writing it: an empty `collaborators: []` remains in 39 trees and is not read (DS-10 now says "non-empty").
- Intended behavior changed: `No`
- Classification: `Large`, `High`
- Next action: architecture review, round 7
- Review result (recorded 2026-11-11, informational): `Pass`, ARCH-REV-007, round 7, on SR-023 (contract revision 6). AR-016 and AR-017 resolved; contract §13 and the DS-10 `collaborators` detail consistent; no open findings. The reviewer delivered the handoff to `/software_engineering_team/implementation_engineer`; the Solution Designer sends none.

### SR-024 — A delegated team run's file is the ordinary team file (TC-12)

- Phase and classification: Requirements (behavior-defining supplement, the Solution Designer's decision within the direction) and Design; `Design Impact` resolved
- Triggering: the Implementation Engineer's message of 2026-11-11 (implementation paused on this point; step 1 committed at `15574e1ba5`). A delegated team's own file has its own schema today (`task-agent-team-tree-schema.ts`): a mounted root address, no `teamDefinitionName`, member `followsTeam`, `launchSource` and `userLaunchSelection`. The ordinary team schema requires `/` (`team-run-execution-tree-schema.ts:44-57`). The contract kept the mounted address but did not say how the two shapes become one.
- The Solution Designer's own validation gap: the contract's attribute check covered the relationship fields, not the remaining shape of a delegated team's file against the ordinary team schema. That check was the contract's job, and §2.2 now has it.
- Measured (read-only, `evidence/data-model-validation/validate_team_run_shapes.py`, `team-run-shapes-2026-11-11.txt`):
  - 153 of 153 delegated teams: root = delegation address (equal to `taskAgent.address`), members directly under it; `archivedAt`, `applicationBinding`, member `role` and `description` all present; `teamDefinitionName` absent in all; `followsTeam` on 770 of 770 members (10 false); member `launchSource` on 10; member `userLaunchSelection` on 8; 2 teams (2026-09, copied from an org) with a handoff to `/Teacher`, outside the team.
  - 601 of 601 user-started teams: root `/`, members under it.
- Decision (TC-12, the Implementation Engineer's option A, generalized): one team file shape, where the root address is the team's own address (`/` when the user started it, the delegation address when delegated, local or peer-started); members under it; handoff `to` kept as stored.
  - The migration fills `teamDefinitionName` (definition-name port, else the definition ID).
  - It applies any team-level selection to the members that follow the team, turns member selections into their own launch, and drops `followsTeam`.
  - Member `launchSource` becomes an optional ordinary field.
  - New delegated team runs are created at their delegation address, also on the peer path (today `/`).
  - No stored address changes, so no agent is told a new name. Options B (rebase to `/`, renaming 770 agents in their own conversations) and C (two shapes) are rejected.
- Also fixed: the contract's examples used `launchSource.origin: "catalog"`, which is not a valid origin; now `agent_default`.
- Intended behavior changed: `No` (agents keep their addresses; the team Settings edit is TC-5's ordinary save)
- Approval impact: the Solution Designer's decision within the user's direction (P1: a delegated run is an ordinary run; no visible change); the user is informed
- Classification: `Large`, `High`, unchanged
- Applied handoff-rule outcome: narrow architecture review; the Implementation Engineer is answered directly and proceeds with TC-12
- Next action: architecture review, round 8 (TC-12 only)

### SR-025 — Every team run is rooted at `/`; every address case written out and replayed (answers ARCH-REV-008 AR-018)

- Phase and classification: Requirements (behavior-defining supplement, the Solution Designer's decision within the direction) and Design; `Design Impact` resolved
- Triggering: ARCH-REV-008 failed SR-024 with AR-018. A team rooted at its delegation address breaks the code that relies on a team run's root being `/`: the server's config, selection, planner, index, launch resolver and member scope, and the web's Settings name. Handoffs to an address outside the team would no longer compile when the run is planned. Then the user asked for every communication case to be written in the contract with the exact address, and checked on the data.
- The Solution Designer's own gap: SR-024 chose the delegation address as the root from the stored shape alone. It did not check the readers of `/`, nor which addresses agents actually write.
- Decision (TC-12 revised): every team run is rooted at `/`, as the 601 the user started and every peer-started team already are.
  - The address a team was delegated to is a name in its delegator's space. It moves to the Task entry's `recipientAddress`, now on every entry: 30 of 30 non-assigned entries take it from `taskAgent.address`.
  - The migration drops the prefix from members and handoffs (153 of 153 without a collision). A handoff `to` outside the team is kept and resolved when it is sent, by step 2 (the assigner's standing agents).
  - No reader of `/` changes, and the peer path is unchanged.
  - This reverses SR-024's rejection of option B. The cost SR-024 gave it ("770 agents renamed") is real only for the members of the 11 delegated teams with an open Task. Their member context gives the new addresses. The 142 closed ones run no more.
- Every address, case by case (contract §10.7, new): A inside one run, B a delegated run to its Task's assigner, C by run ID, D `delegate_task`, E the sender address a receiver is given; each with the exact string and the step.
  - The DelegationTree's ownership is written down: one tree per run the user started, held by collaboration, not by that run's root (P6), and not an address space (contract §2.6).
- Measured (read-only, `validate_every_address.py`, `every-address-2026-11-11.txt`): all 6,646 addressed sends stored in the agents' traces, replayed:
  - Every delivered send reaches the same receiver, except 53 older sends (2026-08 … 2026-10) that addressed a delegated run, which today's code already refuses (run ID only). 51 of them involve a run without a Task record.
  - 3,311 sends change only by the team prefix (`/software_engineering_team/code_reviewer` → `/code_reviewer`).
  - Nothing is newly found: the 10 refused as not found stay refused.
  - 0 delegated teams have a member at the address of a standing agent of their assigner.
  - Sender address: 13,200 within a run and 690 from the assigner are given an address; 747 to the assigner and 167 between runs of one Task are given the run ID only.
  - Two changes against today:
    - A5: inside a delegated team, the team as a unit is no longer an address (0 sends used it).
    - D3: a delegated team's member that delegates to its own team's definition gets a new copy, as in a team the user started (0 refusals in history).
- Intended behavior changed: `Yes`, narrowly. The members of a delegated team use team-local addresses, the same as in the team when the user starts it. The UI's names do not change. The Solution Designer decided this within the direction (P1: a delegated run is an ordinary run); the user is informed.
- Classification: `Large`, `High`, unchanged
- Next action: superseded by SR-026 (the user asked for every case in one file)

### SR-026 — Every collaboration case in one file, checked case by case (contract revision 7)

- Phase and classification: Requirements (behavior-defining supplement) and Design; `Design Impact` resolved
- Triggering: the user (2026-11-11). The collaboration facts were spread over many sections: records, communication rules, address tables, walk-throughs, data examples. The user asked for one file holding each communication case, delegation included: the address or recipient to use, how it is stored on disk, and a check of each case.
- Done:
  - `target-collaboration-contract.md` is rewritten as that file:
    - §1 principles and words;
    - §2 addresses and who may talk;
    - §3 everything on disk, with exact JSON;
    - §4 the in-memory tree;
    - §5 every case (DL-0 … DL-11, A-1 … C-4, R-1 … R-10, E-1 … E-4, T-1 … T-7), each with the call, how it is found and admitted, what is on disk, what is in memory, the result and header, what differs from today, and its check;
    - §6 existing data before and after (E1 … E12);
    - §7 decisions;
    - §8 the validation index.
  - The earlier sections §4, §8, §10, §11, §12 and §13 are folded into it; nothing is dropped.
  - `evidence/data-model-validation/validate_every_case.py` (`every-case-2026-11-11.txt`) checks every case, with each output line keyed by its case ID.
- Found by collecting the cases (the Solution Designer's earlier gaps; message storage had not been checked):
  - **TC-13 (new):** an agent run's message log has two places today: 8 runs the user started log in `agents/<id>/collaboration/`, and 42 delegated runs log in `agents/<id>/`. A delegated run is an ordinary run, so there is one place: the run's own folder, as for team and org runs. The migration moves the 8 logs (DS-10 step 5b). An unconverted JSON log of an unfinished `20261018_…` item is left for that migration's retry.
  - **Extra copies in former hosts' logs:** 1,011 messages inside delegated teams and 53 between two delegated runs (2026-10) are also in the hosting run's log. Each is in its own run's log or logs too. They are kept (P7), and the view rule shows them no more than the owning log does.
  - **The work packet:** a new delegated run's work packet is its first input, not a logged message (129 of 129 runs with one Task entry). Another Task for an existing run is a `task_assignment` message stored in both logs (225 of 227).
- Measured (read-only): 406 of 406 local entries map to DL-1 … DL-7 and can be converted. Within one run, 13,206 of 13,206 messages are in their own run's log; between two runs, 1,604 of 1,604 are in both runs' logs. 6,485 delivered addressed sends reach the same receiver; the 53 older ones are refused, as by today's code. The sender address shown is as in §5.4.
- Intended behavior changed: `No` beyond SR-025 (TC-13 is a storage location; the user sees nothing)
- Approval impact: the user's direction; TC-13 is the Solution Designer's decision within it, and the user is informed
- Classification: `Large`, `High`, unchanged
- Next action: superseded by SR-027

### SR-027 — The contract starts from the runs themselves

- Phase and classification: Requirements (supplement) and Design; no intended behavior changed
- Triggering: the user (2026-11-11). The file is a collaboration contract, not a delegation contract. It starts with the runs the user starts (a standalone agent such as the Project Task Manager, a team such as the Software Engineering Team run on its own, an org), and with how agents talk inside one run ("if I run software engineering alone … what is the address to communicate"). Each case keeps its JSON on disk and its check.
- Done:
  - contract §5.1, the runs you start:
    - RUN-1, a standalone agent: `run_metadata.json`, the run list row, its folder, its address space, and its one refusal (a message to itself);
    - RUN-2, a team: its team file with handoffs, the members' folders, its log, the run list row;
    - RUN-3, an org: its org file with direct agents, mounted teams and handoffs, the folders, its log, the run list row;
    - RUN-4, the retired `task_delegation_records.json` files;
  - contract §5.2, inside one run: IN-1 … IN-8, each with the exact call, `get_handoff_rules` output and log line, and a table of every address case inside one run (A-1 … A-6);
  - the between-runs sections are renumbered §5.3 … §5.7;
  - the case script checks RUN-1 … RUN-4.
- Found: `task_delegation_records.json` (545 team folders) and `agent_org_task_delegation_records.json` (18 org folders) hold 4 records of the old submission model. Only released migrations read them, so they stay (RUN-4).
- Measured (read-only):
  - 485 agent runs the user started;
  - 601 of 601 teams rooted at `/`, with every handoff inside the team (133 have handoffs) and 0 nested sub-teams;
  - 24 orgs rooted at `/`, with 26 direct agents, 74 mounted teams and 625 of 625 handoffs inside the org.
- Classification: `Large`, `High`, unchanged
- Next action: superseded by SR-028

### SR-028 — Every case, walked from the run the user starts

- Phase and classification: Requirements (supplement) and Design; no intended behavior changed
- Triggering: the user (2026-11-11). The cases were grouped by mechanism (delegation, messages by address, by run ID, events). Following one story, such as the Project Task Manager delegating to the Software Engineering Team and the team reporting back, meant jumping between five sections, and RUN-1 listed none of its cases.
- Done: the contract's §5 is reorganized by the run the user starts.
  - Each subsection opens with its list of cases, in the order they happen, and walks each with its JSON:
    - §5.1, a standalone agent (the Project Task Manager), 15 steps: the run; delegating to the team; the team inside; reporting back by address; talking by run ID; another Task; sub-work; sub-work runs talking; further sub-work; different Tasks; description-only; a peer; close, reopen and delete; stop and restart; what it cannot do;
    - §5.2, a team the user starts, run on its own: its members, handoffs, a member delegating, and the delegated agent reporting back;
    - §5.3, an org: its agents and mounted teams, the CEO agent delegating a team, and that team reaching `/ceo_agent` and `/Teacher`;
    - §5.4, the reference tables every run shares: the address replay A-1 … C-4, the run-ID rule R-1 … R-10, the sender address E-1 … E-4, old data (DL-0, RUN-4), and events T-1 … T-7.
  - The case IDs are kept, so the validation script and the design's test list still match.
  - The examples in §3.2 and §6 (E6) now use the image agent as sub-work of T1, one hop under the engineering team, so every example belongs to one of the three stories.
- Classification: `Large`, `High`, unchanged
- Next action: superseded by SR-029

### SR-029 — §5.1 as a sequence of states: the disk after each call

- Phase and classification: Requirements (supplement); no intended behavior changed
- Triggering: the user (2026-11-11) asked to see the transitions. Start with the Project Task Manager alone and its JSON; then the exact call with its address; then, underneath, every file that changed (including whether M's own `run_metadata.json` changes) and every new file in full, the team's execution tree included; and so on, step by step.
- Done: the contract's §5.1 is states S0 … S12, each with the call, the result to the caller, every changed or created file in full, the files that do not change, the in-memory tree, and what the receiver sees:
  - S0: the start;
  - S1: delegate T1;
  - S2: inside the team;
  - S3: report to M by address;
  - S4: M answers by run ID;
  - S5: another Task;
  - S6, S7: sub-work to P and I;
  - S8: P talks;
  - S9: stop and restore;
  - S10: close;
  - S11: reopen;
  - S12: delete.

  The remaining standalone-agent cases are in a table after the states. The case IDs are unchanged.
- Measured or read for the states (read-only):
  - A delegation does not touch the Task's own `task.json`. Only `update_task` sets its status (no code sets `IN_PROGRESS` on delegation; the 10 Tasks with an open entry are `IN_PROGRESS`).
  - `project_runs.json` lists only runs the user starts from the Project (57 entries, 0 delegated).
  - A Task folder gets `agent_run_resources.json` at its first delegation (109 Task folders have only `task.json`).
  - Stop sets `terminatedAt` on the run's own row, and restore clears it (`agent-run-history-catalog-service.ts:216-266`, `team-run-history-catalog-service.ts:121`).
  - M's `run_metadata.json` gains `address` at its first delegation, and its row gains `hasCollaboration` (§3.3, §3.5).
- Next action: superseded by SR-030

### SR-030 — The contract's examples checked against its rules; the peer walked as states

- Phase and classification: Requirements (supplement) and Design; no intended behavior changed
- Triggering: the user (2026-11-11) asked whether the state walk is consistent, and whether the peer case is written down.
- Done:
  - `evidence/data-model-validation/validate_contract_examples.py` reads every JSON example of the contract's §3 … §5 and checks them against the contract's rules:
    - each Task entry is complete;
    - each run's own `delegatedFrom` equals its entries';
    - each team file is rooted at `/`, with its coordinator and handoffs inside the team (outside only for a delegated team);
    - each entry's coordinator equals the team file's;
    - each delegator is an agent of its delegating run;
    - each tree node's parent and Task assigner equal the entries';
    - each message between two runs is one that rule (a) or (b) allows.

    Result: 0 findings. Three planted errors were each caught, so the check works.
  - Read against the code, the walk had three errors, all the Solution Designer's:
    - S10: a closure stops only runs with no other open Task (CM-6). E keeps T6 and is not stopped.
    - S11: only an `assigned` entry is continued after a reopen, by its assigner (`task-execution-resources.ts:119-134`). `subWork` entries stay closed.
    - S12: a Task deletion stops only runs with no other open Task.

    All three are corrected, along with the T-1 … T-3 rows.
  - The peer is now walked as states S13 … S15, with both nodes' files in full: delegating to a team on node B; the team reporting to M by run ID across nodes; M closing the Task and the peer run stopping through the link.
- Found (the peer case, an inconsistency with P8):
  - Today node B answers node A with a peer team's members addressed under the delegation address (`/marketing_team/marketing_content_creator`). That is node A's former mounted address space; on node B the team is rooted at `/`. The 2 stored links carry the prefix.
  - Target: the entry's `members` carry each member's own address (`/marketing_content_creator`). Node B's answer stops mounting them (`remote-team-run-starter.ts`, added to the removal plan), and the migration drops the prefix (DS-10 step 3, 4 addresses).
  - Node A reaches peer members by run ID only, so nothing resolves these addresses; they are shown by leaf name.
- Classification: `Large`, `High`, unchanged
- Next action: superseded by SR-031

### SR-031 — The contract as an executable model; every state generated

- Phase and classification: Requirements (supplement) and Design; no intended behavior changed
- Triggering: the user (2026-11-11). The contract should record every collaboration case, local and across nodes: each address, each data change, each transition. It must be validated as such, so that the code can be implemented from it. Until now the transitions were hand-written, which is how the errors of SR-030 got in.
- Done:
  - `evidence/collaboration-model/model.py`: the rules of §2 … §4 as code on an in-memory disk:
    - starting a standalone agent, a team and an org;
    - `delegate_task` (new run; existing run; sub-work joining the delegator's current Task; description-only; a peer node);
    - `send_message_to` by address (steps 1 … 3) and by run ID (rules (a) and (b), the assigner's continuation, across nodes);
    - the sender address shown;
    - stop, restore, `update_task` close and reopen, Task deletion;
    - the `DelegationTree`, derived.
    Refusals use the code's exact texts.
  - `stories.py`: the three stories of §5, 37 steps: the Project Task Manager with a peer node (S0 … S19), a team (U0 … U7) and an org (O0 … O8).
  - `walkthrough.py` generates `collaboration-walkthrough.md`: every state, with the call, the result, the receiver's header, every created, changed or removed file in full (new rows and log lines), the unchanged files, and the tree. It also generates the step lists of the contract's §5.1 … §5.3.
  - `--check` fails when the walkthrough, the step lists or any JSON example of §3 … §4 differs from the model. Three tamperings were each caught.
  - `validate_contract_examples.py` on the walkthrough: 107 JSON blocks, 0 findings.
- Found by running the stories (the hand-written walk had them wrong or unstated):
  - **Sub-work joins the delegator's current Task**, its most recently linked entry, not any open Task (`task-execution-resource-service.ts` `linkInherited`, `new-copy-work.ts`). Delegating sub-work after M gave E T6 would have joined T6, so the story gives T6 after T1's life.
  - **An assigner's continuation reopens the run's last `assigned` entry only.** A run that works on another open Task is reached through that Task, and its closed entry stays closed.
  - **A delegated team has its definition's members and handoffs.** The contract's examples showed E with 2 members, and U (the same definition) with 4. The §3 examples are now model states.
  - **The header of a message from another node** is `You received a message from the agent with sender run id "<id>" on node "<node>".` (`received-message-header.ts`).
- The rules themselves stay validated on the user's data by `validate_every_case.py` (6,646 addressed sends, 16,006 messages, 406 entries); the model guarantees that the transitions follow them.
- Design: the acceptance test of the ticket runs the same stories against the server and compares its files with the walkthrough after every step.
- Classification: `Large`, `High`, unchanged
- Next action: the user reads the file; then architecture review, round 9 (TC-12, TC-13, the contract's model and §5)

### SR-032 — Which Task a delegation belongs to: two rules decided by the model

- Triggering: the Implementation Engineer (Unclear, 2026-11-11) found the executable model (SR-031) differing from the base code at two points and asked which wins. The user (2026-11-11): the contract and its model are the authority, and the code may be refactored to them. So the two points were decided on the data model's merits.
- Decided (contract §2.4, new):
  1. **Sub-work joins the run's current Task**: its newest open entry, else its newest entry, which must be open. A run with an older open Task and a newer closed Task still works on the open one. The model's first rule (the most recently linked entry, refused when closed) refused legitimate work and was wrong.
  2. **A run that works on a Task cannot use `task_id`** (`TASK_AGENT_RESOURCE_OWNED_SENDER`). An `assigned` entry gives its assigner the run's continuation, so only an agent that works on no Task assigns Tasks; a Task's runs hand on work as `subWork` of the same Task. The model had allowed it.

  Both equal today's code.
- Done: `model.py` corrected; a new state S20 (the refusal); the walkthrough and the contract's step lists regenerated. `walkthrough.py --check` passes, and the walkthrough's examples have 0 findings.
- Intended behavior changed: `No`
- Next action: the user reads the file; then architecture review, round 9

### SR-033 — The Task rules of §2.4 as cases in §5

- Triggering: the user (2026-11-11): the rules of §2.4 belong in §5 as concrete cases with their data, as well as in §2.4. For example, a run assigned a Task and working on it, then assigned another; then the sub-work.
- Done: three states added to the Project Task Manager story, after S12 (E is given T6 while T1 is open):
  - **S13 (DL-12):** E hands on sub-work; it joins T6, its newest open Task, as a `subWork` entry in T6.
  - **S14:** M closes T6. The T6 sub-work run stops; E is not stopped, because T1 is open.
  - **S15 (DL-13):** E hands on sub-work again; it joins T1, the older open Task, and is not refused.

  The later states are renumbered: the deletion is S16, and in it E now has no open Task left and is stopped; the peer is S17 … S19; the refusals are S20 … S23, with S23 the `task_id` refusal. The R-7 state now has the research agent message E.
- Also corrected: the model's own wording of the self and own-team delegation refusals is replaced by the code's texts (`collaborator-errors.ts:68-73`), and a step's results are shown in call order.
- Checks: `walkthrough.py --check` passes; the walkthrough's examples have 0 findings.
- Next action: the user reads the file; then architecture review, round 9

### SR-034 — Answers ARCH-REV-009 AR-020; AR-019 goes to the user

- Triggering: ARCH-REV-009 (round 9) failed SR-033 with AR-019 (Requirement Gap) and AR-020 (Design Impact). It accepted TC-13, the peer member addresses, §2.4, the executable model as reference, and TC-12 revised as a structure (pending AR-019).
- **AR-020 (the Solution Designer's model error):** the model stopped a peer's run on Task closure, and S19 called that "today". At `827f1e68dc` a closed Task's peer run is fenced, not stopped (`remote-endpoint.ts:44-46` `closureFence`; `root-task-execution-resource-scope.ts:85-106`), and a stop across nodes is out of scope (`requirements-doc.md:68`).
  - Now `model.py` fences: node A closes the entry and nothing is sent to node B.
  - S19 shows the peer run's next report refused with the closed-Task text, and node B's row unchanged. Its "today" text is corrected, as is contract T-1.
  - `walkthrough.py --check` passes; the walkthrough's examples have 0 findings.
- **The reviewer's note:** address step 2 now applies by the run's Task entries, not by its own `delegatedFrom` (`model.py` `resolve`). A run of a deleted Task uses step 3, as §5.4.4 says.
- **AR-019, a Requirement Gap:** TC-12 revised (SR-025) and the D3 / DL-11 change alter what agents read. The approved non-goal is "No change to what an agent reads … collaboration texts" (`requirements-doc.md:76`), and the user was only informed. The trade-off goes to the user:
  - (1) root at `/`: agents re-addressed and told, with no reader changes;
  - (2) root at the delegation address: nothing agent-visible changes, with the reader and handoff-compiler changes of AR-018.

  The Implementation Engineer is asked to hold the TC-12 and DL-11 parts until the user decides.
- Next action: superseded by SR-035

### SR-035 — The user decides AR-019: option 1, every team at its own root

- Phase: Requirements (approval of an agent-visible change) and Design; `Requirement Gap` resolved
- Triggering: ARCH-REV-009 AR-019. TC-12 revised (SR-025) and the DL-11 change alter what agents read, against the approved non-goal "No change to what an agent reads". The Solution Designer put the trade-off to the user with worked examples:
  - option 1, every team at `/`: a delegated team's members write `/code_reviewer`;
  - option 2, today's addresses: `/software_engineering_team/code_reviewer`.
- The discussion (2026-11-11): the user first preferred option 2 for its hierarchy, and the Solution Designer then also leaned to it. The user then weighed it again: "Option 1 actually makes sense. The team member is in the team. Why do I add a second order? … When I address my team member, I should feel like I'm on the root." The Solution Designer checked option 1 against every way an address is used:
  - delegation uses a catalog address in the delegator's own list, the same in both options;
  - afterwards runs talk by run ID, the same in both;
  - without a run ID, an agent reaches its own team, its Task's assigner's agents, or its own run's agents, the same in both apart from the teammates' prefix.

  Option 2's prefix does not show the delegation hierarchy: sub-work delegated by E is addressed `/product_team`, not under `/software_engineering_team`. The hierarchy is kept in `delegatedFrom` and the tree. The one weakness of option 1, a teammate and an assigner's agent with the same name, is resolved by the own team first (0 such clashes in the data).
- Decision (the user, 2026-11-11): "If option one feels more reasonable, we definitely use option one." The Solution Designer judged option 1 more reasonable in every case, as recorded above.
- Done:
  - `requirements-doc.md`: the non-goal "No change to what an agent reads" records this exception: teammates' addresses, the one-time notice to members of open delegated teams, and DL-11's new copy.
  - The contract's TC-12 row: decided by the user.
  - The contract, the model and the walkthrough were already option 1 (SR-025), so there is no change there. `walkthrough.py --check` passes.
- Classification: `Large`, `High`, unchanged
- Next action: architecture review, round 10 (AR-019 decided by the user; AR-020 answered at SR-034)

### SR-036 — How a delegated team's member learns its new addresses (the Implementation Engineer's Unclear)

- Triggering: the Implementation Engineer (Unclear, 2026-11-11). The requirements' exception (SR-035) and a design test said the members of open delegated teams are "told their new addresses once", but neither the contract nor the model said how, or what is stored for "once". The engineer proposed a one-time marker in the team's own file plus a platform notice, or a sentence always present in the member context.
- Read: an agent's prompt states no address of its own and tells it to "use only an exact address you were given" (`collaboration-prompt-sections.ts`). After the migration, every source of addresses gives the new ones: `get_handoff_rules`, `list_available_agents` and message headers. The only stale source is the agent's own conversation.
- Decision (the Solution Designer, on the data model's merits): **correct at the point of use, store nothing.**
  - When a delegated team's member writes an address under its run's `recipientAddress`, the name the team was delegated to and the prefix its members used before, the refusal names the address to use: "… is no longer an address: your team is addressed from its own root. Use /code_reviewer." For the team's own old address, it names the coordinator.
  - It is computed from the Task entry, so the team's file gets no migration marker and the prompt no extra text. It also helps whenever an old address is copied from history, also long after the migration, which a "once" notice would not.
  - The member context is not changed.
- Done:
  - `model.py`: `resolve` corrects such addresses. New state S24.
  - Contract §2.3, A-5 and A-6.
  - `requirements-doc.md`: the exception says how members learn the addresses.
  - The design's test line.
  - `walkthrough.py --check` passes.
- Approval: within the user's decision of SR-035 (option 1). The way members learn their addresses is less intrusive than the "told once" the user was shown, and the user is informed. The architecture review passed SR-035 in round 10 (ARCH-REV-010); this refinement is sent to the reviewer as a narrow note.
- ARCH-REV-011 (2026-11-11): Pass, no finding. Its note is applied: the correction is checked after address step 2 (`model.py` `resolve`; contract §2.3), so it can never hide an agent of the assigning run. `walkthrough.py --check` passes.

### SR-037 — A run never delegates to its own definition (the Implementation Engineer's Unclear)

- Triggering: the Implementation Engineer (Unclear, 2026-11-11). The model's `delegate` gave a new copy for the sender run's own definition, and story U7 called that "the same in a team the user started". Today's code refuses it in every root:
  - `collaborator-candidate-policy.ts` `requireEligible` ("… is this run's own definition");
  - `CollaboratorAdmission.catalogDefinitionAt`, so `delegate_task("/software_engineering_team")` from a member of a team the user started ends as `COLLABORATION_TARGET_NOT_FOUND`, "'/software_engineering_team' is not the address of an available agent or agent team. …";
  - an approved earlier requirement, autobyteus-455 AC-006: "a run neither lists nor delegates to its own definition".
- The Solution Designer's error: SR-025 read today's behavior from a heuristic count (5 delegated-team calls "to their own team's definition") and wrongly took it for a new copy in a team the user starts. That error became the DL-11 change in the exception the user approved at SR-035.
- Decision (on the data model's merits): **a run never delegates to its own definition** (option (b)). A run delegating to its own definition copies itself, and each copy could copy itself again. An agent that needs its own kind of work done does it itself, or asks a teammate. The rule holds in every run:
  - in a delegated team, now rooted at `/`, the refusal is the own-definition refusal that teams the user starts already give;
  - for an agent run whose stored address differs from its definition's (6 of 43), its definition's catalog address is refused the same way.

  The "already in this run" admission rule is unchanged.
- Effect on the user's approved exception (SR-035): one of its three agent-visible changes, the new copy, is withdrawn. Only the refusal's text changes inside a delegated team. Today that team answers with its own-team text; it now answers with the own-definition text every team already gives. The exception is narrower, so the user is informed.
- Done:
  - `model.py` refuses the own definition.
  - U7 is now that refusal, and the new state U8 shows a description-only delegation (DL-8) from a run that works on no Task.
  - `requirements-doc.md`'s exception and the design's test line are corrected.
  - `walkthrough.py --check` passes.

- ARCH-REV-012 (2026-11-11): Pass, no finding. The SR-035 exception only narrows; informing the user is enough. `walkthrough.py --check` re-run by the reviewer: passes.

### SR-038 — A peer child row's launch details are read from the peer (the Implementation Engineer's Unclear)

- Triggering: the Implementation Engineer (Unclear, 2026-11-11). Today a peer run's tree link stores `launches`, each agent's runtime, model and launch source as the peer resolved them (autobyteus-32 REQ-009), and the delegating run's view shows them on the peer child row. The new model's peer entry (§3.1) has no `launches`, so migration E3 would drop them. REQ-009 preserves "the launch notes". The options were (a) store them in the entry, (b) read them from the peer, (c) drop them.
- Read (read-only): 0 of the 2 stored peer links hold `launches`. The peer's run summary today carries a title and statuses per agent, no launches (`peer-run-view-answers.ts`).
- Decision (on the data model's merits): **(b)**. An agent's launch is the run's own fact on its node (P4, one owner; CM-10, the node that runs a run owns it). A copy on the delegating node would be a second owner and goes stale when the run's settings change there. Local child rows already read launches from the run's own file. The peer's summary gains `launches` per agent; nothing is stored. This is within REQ-009, since the launch details stay on the row, and nodes run the same release (no version negotiation).
- Done:
  - contract §3.1, "Not in a peer's entry";
  - the design's DS-8, with the reader `remote-task-execution-dto-projection.ts`, the summary's new field and tests.

  The model is unchanged: it stores nothing and does not model views. `walkthrough.py --check` passes.

- ARCH-REV-013 (2026-11-11): Pass, no finding. The peer summary path is read-only (REQ-004 holds); the payload change is a clean cut between same-release nodes; `walkthrough.py --check` re-run by the reviewer: passes.

### SR-039 — A child's launch edited in its delegator's Settings goes to the child's own save (the Implementation Engineer's Unclear)

- Triggering: the Implementation Engineer (Unclear, 2026-11-11). Today a stopped delegated run's model and runtime are editable in its delegator's Settings. The Save sends them as `changes`, which wrote `userLaunchSelection` into the delegator's tree. TC-5 removed that field, and there is no copy record in the delegator any more. The options were (a) route each change to the child's own stopped-run save, or (b) remove the child rows from the delegator's Settings. The engineer recommended (b).
- Decision (the Solution Designer): **(a)**. REQ-009 preserves "everything else a user … can do today with a delegation", and editing a stopped child's launch from the delegator's Settings is one of those things. Removing it would narrow an approved requirement. (a) also keeps the ownership rule: the delegator's view sends a command, and the child's own service writes the child's own file, the pattern of DS-8 for Stop and messages (`DelegatedRunCommands`). No run writes another run's file.
- The trade-off accepted: the Save is no longer one atomic write. All children are checked first: stopped, and every patch valid. A failure after a write reports what was saved. Each run's file is its own truth.
- Done: the design's DS-8 (routes, order, failure result, tests). The contract is unchanged, since views are not in the model. The web is unchanged.
- ARCH-REV-014 (2026-11-11): Pass, no finding. Its note is applied in DS-8: a partial failure is reported as `PERSISTENCE_FAILED`, with a message naming the runs saved, so the unchanged web shows it.

### SR-040 — The history poll, answered from the view's projection (answers CR-461-002, Design Impact)

- Triggering: code review CRR-003 failed with CR-461-002 (Design Impact). The history poll `agentRunCollaborationStatuses`, a derived consumer of the removed hosting, was never inventoried. The design's readers table, Change Scope and review did not name it. The implementation answered `statuses: []`. The unchanged web then re-read an active hub every 5 s, and lost the children's live status under listed runs that are not open (autobyteus-426 REQ-009, kept by this ticket's REQ-009 and REQ-002).
- The Solution Designer's gap: the readers inventory missed this consumer of the hosting root's in-memory state. The design's own rule ("a reader not in this table is an escalation") caught it in code review.
- Read: the new view's `closed_task_executions` is always `[]`, in every projector, because a child whose Task closed leaves the view. The web (`agentRunCollaborationStore.ts`) has two branches:
  - for a stopped hub it looks at the digest only, once per value; that assumed a stopped host's children were stopped;
  - for an active hub it re-reads on any difference, with no guard.
- Decision (on the data model's merits): the poll is a second consumer of **the same projection as the view** (DS-8).
  - The server answers active and stopped runs alike, never restoring: `isActive`; the statuses of every agent of the view's local child rows, from each child's own root, else `offline`; and the digest of the view's (empty) closed set.
  - The web uses one rule for every hub: re-read on a difference, at most once per distinct answer; otherwise apply the statuses.

  The stopped-host branch goes, because children now live on while their delegator is stopped, and their rows must follow them. The constant digest field stays until FU-008 removes the hosting-only fields.
- Done: the design's DS-8 (server, web, tests). FU-009 notes where it is designed. The contract is unchanged (views are not in the model), and `walkthrough.py --check` passes.
- The four Local Fixes of CRR-003 (CR-461-001, -003, -004, -005) are the Implementation Engineer's. Each restores what the design already states: DS-5's closure re-check in the gate, race row 5, the readers table's unchanged token totals, and `DESIGN.md` rule 11 and Principle 15.

### SR-041 — Hosting-only fields removed in this ticket (answers ARCH-REV-015 AR-021)

- Triggering: ARCH-REV-015 failed SR-040 on AR-021 (Medium, Design Impact). SR-040 kept a constant `closedTaskExecutionsDigest` and a web rule comparing it, in files SR-040 changes. FU-008 deferred other fields this ticket makes dead, on the ground that "the web stays unchanged", although the web's stores and contexts are being changed. The ticket-scope rule (Principle 7) makes dead code in touched files this ticket's work, and server and web ship together (rule 9).
- Checked (read-only, `git diff --name-only origin/personal...HEAD`, 613 files), item by item: the producer of every FU-008 item was removed or touched by this ticket.
  - `closedTaskExecutionsDigest`: its resolver and its provider are touched.
  - `closed_task_executions` / `closedTaskExecutions`: all three view projectors, both history services and a web reader are touched.
  - The two events: their producers, the hosting lifecycle and the roots' launch editing, are removed; the server emits neither.
  - The Memory explorer's flags: `team-memory-explorer-service.ts` is touched. The kinds share their schema.
- Decision: all of them are removed here, with their contracts and readers (the design's removal plan lists the files). FU-008 is withdrawn. The poll answers no digest, and the web re-reads only on a difference in active state or local children, once per distinct answer.
- The residual note is taken too: the `DelegationTree` keeps each run's agents by run ID **and address**, read once (contract §4; `model.py` `agents_with_addresses`), so the view and the poll read no file per request. The walkthrough is regenerated, the §4 example is a model state again, `walkthrough.py --check` passes, and the examples have 0 findings.
- Next action: architecture review (AR-021); then the Implementation Engineer, with CRR-003's Local Fixes, and the code review's targeted re-review

### SR-042 — Live child rows in an open view (answers ARCH-REV-016 AR-022)

- Triggering: ARCH-REV-016 resolved AR-021 and the residual, and failed SR-041 on AR-022 (Medium-High, Design Impact). An open view's child rows had no live path:
  - DS-8 builds them when the view opens;
  - the hosting lifecycle that pushed `task_execution_started`, `task_executions_closed` and `task_executions_reopened` is removed;
  - SR-041 removed the reopened event, claiming "a reopened child comes back through the view's child list", which is built only at open;
  - the history poll covers only runs that are not open.

  Protected: REQ-002, REQ-005 / AC-005, AC-007, and 469's reopened row listed again without a reload.
- The Solution Designer's error: SR-041's claim about the reopened child. The view's child list is not live.
- Read: today the roots emit the three events. The web reloads the view on `task_execution_started` (`checkpoint_required`), and handles closed and reopened by a closed set, which SR-041 removes.
- Decision (on the data model's merits): **the view is a projection, so it is told when its source changes, and reads itself again.** The `DelegationTree`, already updated synchronously inside each Task change, reports `childRowsChanged(X)` for every run X whose open children changed. `ChildRowsFeed`, the one listener, publishes `child_runs_changed` (collaboration and org streams) / `CHILD_RUNS_CHANGED` (team stream) on each open view stream of X, active or not, never starting X. The web answers with `checkpoint_required`, as it answers today's `task_execution_started`: the re-read carries every row's record (469 D-8).
  - The three events and `remote_task_execution_started` are replaced by this one, because their producer is gone.
  - `remote_task_execution_summary` stays.
- Done: the design's DS-8 ("Live child rows", with tests per view kind) and the removal plan. Views are not in the model. `walkthrough.py --check` passes.
- Next action: architecture review (AR-022)

### SR-043 — The Team view applies child-row changes in place (answers ARCH-REV-017, AR-022 narrowed)

- Triggering: ARCH-REV-017 accepted SR-042's source, owner and order, and the agent-run and org views. It narrowed AR-022 to the Team view. DS-8 claimed the web answers the new event "as today's `task_execution_started`, with `checkpoint_required`", but at `827f1e68dc` the Team client has no such path:
  - it inserts `TASK_EXECUTION_STARTED`'s record in place (`teamExecutionViewState.ts:385-402`);
  - its only re-read is `team_stream_recovery_required`, a manual recovery that drops pending sends, interrupts and approvals (469 CR-003; 469 D-8 avoided it by putting records in the event).
- The Solution Designer's error: the claim was checked against the agent-run client only.
- Decision (option (a), uniform on the three streams): `child_runs_changed` / `CHILD_RUNS_CHANGED` carries `{ run_id, added: [row records], removed: [run references] }`. `ChildRowsFeed` builds the records with the view's own projection function, so applying them equals a re-read.
  - The Team client applies the change in place: it inserts as for `TASK_EXECUTION_STARTED`, removes with a new `removeTaskExecution`, hands back the focus, and reconciles navigation. Its stream and pending work are kept.
  - The agent-run and org clients keep their automatic `checkpoint_required` re-read.
- Done: the design's DS-8 (payload, Team handling, tests, including pending send and approval surviving). `walkthrough.py --check` passes.
- Next action: architecture review (AR-022)

### SR-044 — Child-row events are unsequenced and idempotent, ordered by the stream session (answers ARCH-REV-018, AR-022 narrowed)

- Triggering: ARCH-REV-018 accepted SR-043's payload and in-place Team handling. It narrowed AR-022 to the Team stream's sequencing:
  - the Team client accepts a sequenced event only at `changeSequence + 1`, and a gap goes to manual recovery;
  - an unsequenced event can race the snapshot;
  - `insertTaskExecution` throws on a row the view holds.

  DS-8 did not say whether the event is sequenced, who allocates the sequence for a stopped team, or how a duplicate or unknown row is applied.
- Read: the snapshot (`TEAM_EXECUTION_VIEW_SNAPSHOT`) is sent in-band on the same stream connection as the events (`team-stream-server-message.ts`).
- Decision (option (b), on the data model's merits): child-row membership is the `DelegationTree`'s, not the team run's ordered change stream. Sequencing it would tie the event back to the run's root, the coupling this ticket removes, and a stopped team has no root loaded.
  - The event is unsequenced and applied by membership (skip a held `added` row, ignore an unknown `removed` row).
  - The stream session orders it against the snapshot: an event published while the session builds a snapshot is held and sent right after it, and the snapshot reads the tree when it is built. A change is therefore either in the snapshot (and its event is a no-op) or applied after it. None is lost, and no gap is possible.
- Done: the design's DS-8 (the rule, the session's order, and the Team tests: a stopped team run, a change racing a snapshot, duplicate and unknown rows). `walkthrough.py --check` passes.
- Next action: architecture review (AR-022)
- ARCH-REV-019 (2026-11-11): Pass. AR-001 … AR-022 are resolved. Its residual is added to DS-8's tests: held events are flushed in published order (FIFO), each once.

### SR-045 — A view's stream lives with the open view (answers CR-461-006, Design Impact)

- Triggering: code review round 2 (CRR-005) failed with CR-461-006 (Design Impact). The web keeps no view stream for a stopped run:
  - the agent-run client detaches on a stop, and ends a stream at an inactive snapshot;
  - a child command's `whenReady` rejects;
  - the org client attaches only an active run.

  Under a stopped delegator, the ticket's own case, the view gets no live child rows or output, and the user cannot message a child. That fails SCN-005 / AC-007 and its alternate, REQ-002, and DS-8 / SR-042's "active or not". The server supports all of it.
- The Solution Designer's gap: the web's stream lifetime and readiness are derived consumers of "a stopped host's children are stopped", the assumption SR-040 removed for the poll. The design never inventoried them.
- Decision (on the data model's merits): **a view's stream lives with the open view, not with the run's activity**, for every client and the phone layout.
  - A stopped run's snapshot is an ordinary snapshot.
  - Readiness is the stream's own (open, with its snapshot applied).
  - A child command goes to the child's own root, so it never starts the delegator (REQ-004). A message to the delegator itself starts it on its first input, on the same stream.
- Done: the design's DS-8 (the rule, the readiness, each client, the server, the tests). FU-012 is withdrawn into CR-461-007, as the code review placed it. FU-013 is recorded by the code reviewer. The contract is unchanged (views are not in the model), and `walkthrough.py --check` passes.
- The Local Fixes of CRR-005 (CR-461-001 residual, CR-461-005 residual, CR-461-007) are the Implementation Engineer's, as the code review states them.
- Next action: architecture review (narrow); then implementation

### SR-046 — A stopped team or org run's view is served from its stored file (answers ARCH-REV-020 AR-023)

- Triggering: ARCH-REV-020 accepted SR-045's web rule and the standalone server. It failed on AR-023 (High): DS-8 said "a view stream's connect never starts or restores the run", which at `827f1e68dc` holds for the standalone stream only.
  - The team connect restores a stopped team (`agent-team-stream-handler.ts:64, 240` → `resolveActiveTeamRun` → `restoreTeamRun`). A managed team reads as active, refuses its stopped-run Settings (`RUN_ACTIVE`) and its archive.
  - The org connect refuses a stopped org (`agent-org-stream-handler.ts:53`).
- The Solution Designer's error: the statement was checked against the standalone stream only.
- Decision (the reviewer's first option, on the data model's merits): no stream kind restores its run to serve a view, so "active" keeps meaning "running" and no reader of activity changes.
  - A team or org view session has a **stored mode**, while the run is not managed: a snapshot from the run's own stored file through the same projection, child rows from the tree, `ChildRowsFeed` events, the children's output, and child commands to the child's own root.
  - It has a **live mode**, while the run is managed: today's session.
  - It switches on the run's lifecycle with a fresh in-band snapshot, a new sequence base, so there is no gap or recovery.
  - A message to one of the run's own members restores the run on that first input.
  - The other option, separating "active" from "managed" across every reader, is the larger change U-001 sized, and is not taken.
- Done: the design's DS-8 (the server per stream kind, the modes and the switch, the tests). `walkthrough.py --check` passes.
- Next action: architecture review (AR-023)
- ARCH-REV-021 (2026-11-11): Pass. AR-001 … AR-023 are resolved. Its residual is added to DS-8's tests: the restore snapshot keeps the restoring member's input state.

### SR-047 — Owners this ticket adds are passed in from one composition root (updated Principle 16)

- Triggering: the `solution-designer` skill was updated on 2026-11-11 with Principle 16, "Visible Dependencies, One Composition Root". It says:
  - an owner receives its collaborators from one composition root;
  - a new process-wide lookup for an owner needs a fired Structural Trigger with a reason, and "the composition binds it at startup" is not one;
  - `find…()?.… ?? fallback` is behavior by absence;
  - in code a change touches, a new dependency is passed in.

  The Implementation Engineer asked whether the seven bindings this ticket added, recorded under FU-011 as "the pattern existed before this ticket", come into this ticket.
- Decision: **yes.** Under Principle 16 the seven bindings and nine fallback sites are new hidden dependencies, and no reason for them stands. The startup split across two composition files, and the Project Task service created before the run control it needs, is an order to write down, not a cycle.
  - The design's new section "Dependency Rules And The Composition Root" gives the order in `build-studio-server.ts`, with the consumers that receive each owner.
  - The removal plan removes the bindings.
  - FU-011 is narrowed to the older lookups the change only uses.
- Applying the updated skill: the template's "Dependency Rules" requirement is answered by that section, and the Structural Trigger "Hidden dependency" is recorded as fired, with its evidence and resolution.
- Next action: architecture review (narrow); then implementation, in IR-003
- ARCH-REV-022 (2026-11-11): Pass. Its two spec corrections are applied in "Dependency Rules And The Composition Root": `childRowsFeed.follow` moves to step 7, after the feed's creation, with the stream session registry as its own owner passed to the feed and the handlers; and a Task change with no entries listener set fails instead of skipping.

### SR-048 — Restoring a stopped team for a member's message: restore, switch to live, then post (the Implementation Engineer's question)

- Triggering: the Implementation Engineer (IR-003). With SR-046 and the ARCH-REV-021 residual, a team send that starts a stopped team can hang in the web.
  - The web settles a team send only on the `MEMBER_INPUT_MESSAGE` echo (`teamSendAdmission.ts`; `TeamStreamingService.ts:358`). The team stream sends no acknowledgement and has no timeout.
  - The server emits the echo when the agent takes the input, after the post (`team-flat-execution-callbacks.ts:50`).
  - The session switched to live after posting (`whileRestoring`, `agent-team-stream-handler.ts:122`), with the snapshot's base at the current sequence. The echo could therefore fall before the base and never be delivered, and the snapshot cannot settle the send.
- Decision (option (a), on the merits): the view session restores the run, switches to live (an in-band snapshot, then a subscription to the live events), and only then posts the message. The echo is then an ordinary live event after the snapshot.
  - The web keeps the local message, the draft and the pending send through the snapshot, so the residual (input state kept) still holds, and the echo settles the send.
  - Option (b), acknowledging `SEND_MESSAGE` on the team stream, would change a contract for an ordering problem.
  - Option (c), settling from the snapshot, would settle because an event is missing, which is behavior by absence (Principle 13).
- Done: the design's DS-8 (the order and its reason; the test that the first message to a stopped team's own member settles). `walkthrough.py --check` passes.
- ARCH-REV-023 (2026-11-11): Pass, no finding. Its wording note is applied in DS-8: the send settles in the web's send tracker, by identity, on the echo, and a snapshot does not drain the tracker. This supersedes the ARCH-REV-021 residual's wording about the snapshot keeping input state.

### SR-049 — The tool path orchestrates delegation and cross-run messages; roots answer only for their own run (the cycle the Implementation Engineer found)

- Triggering: the Implementation Engineer, implementing SR-047, found a cycle the steps do not resolve.
  - `TaskDelegation` (step 6) needs the run services: to start runs, to discard, and to deliver the work packet through the root resolver.
  - The roots those run services create (step 3) call `TaskDelegation` (`delegateThrough`, today's `bindTaskDelegation` lookup) from `root-team-run.ts:271,280`, `standalone-root-message-delivery.ts:158,166`, `agent-org-run-message-delivery.ts:155,163` and `remote-delegation.ts:64`.
  - `CrossRunMessageDelivery` has the same shape, and its consumer `GlobalAgentRunMessageRouter` is a lazy singleton with no initialization call.
- The Solution Designer's gap: SR-047 wrote the order without checking the roots' calls into the delegation owners.
- Decision (option (b), on the merits): **a root does not delegate.** That is the last trace of hosting. Under this design a root holds only its own run (P6; the Ownership Map).
  - The tool path orchestrates. The `delegate_task` tool service calls `TaskDelegation`, which asks the sender's root, in its gate, only for what it owns: identity and address, its own catalog address map, and the own-address, own-team and own-definition refusals.
  - The `send_message_to` dispatcher asks the sender's root for step 1 (and step 3 for a run with no Task), and `CrossRunAddressResolution` for step 2.
  - Dependencies run one way: tool services → delegation and cross-run owners → root resolver → run services. There is no cycle.
  - Option (a), a narrower launcher, would still cycle through the work-packet delivery's root resolver.
- Also decided:
  - **The engineer's (2):** a root's `TaskWorkerStatusNotice` receives the Task side and calls `taskExecutionsStatusChanged` directly. `TaskRunControl.statusChanged` goes.
  - **The engineer's (3):** the steps live in a dedicated composition file, called twice in order from `build-studio-server.ts`, which is at its 500-line limit, with the run services between the calls.
  - **`GlobalAgentRunMessageRouter`:** constructed by the composition root with its collaborator. Its existing getter returns that instance, and replacing the getter's callers is FU-011.
- Done:
  - DS-1 and DS-3, whose spines now start at the tool service;
  - "Dependency Rules And The Composition Root" (steps 3, 6, 8, where the code lives).

  `walkthrough.py --check` passes (the model has no roots, and its rules are unchanged).
- Next action: architecture review (narrow)
- ARCH-REV-024 (2026-11-11): Pass, no finding. Its two notes are applied in the composition section: the tool path is stated (framework registry → the existing dispatcher and router initializers, installed at step 8), and the duplicate `GlobalAgentRunMessageRouter` bullet goes.

### SR-050 — The application host keeps today's behavior, stated as rules (the Implementation Engineer's question)

- Triggering: the Implementation Engineer, implementing SR-047 and SR-049, found a second composition root, the application host (`start-standalone-application-host.ts:242-268`), that the design did not cover. It composes the Task side and the run services but not delegation, so today's lookups answer null there:
  - `delegate_task` answers `TASKS_UNAVAILABLE_TEXT`;
  - a closed Task stops no run;
  - worker status is null;
  - messages between runs take the live-only path.
- The Solution Designer's gap: the composition section named only the studio's root.
- Decision (option (b), on the merits):
  - The application host offers no delegation. Application-owned runs are kept out of collaboration, and delegated runs live in the studio process, so it holds none.
  - It keeps today's behavior, now explicit: `UnavailableTaskDelegation` (today's text), a run control that releases nothing and reports no status, no cross-run delivery, and no local children. It is composed through the same file, steps 1–3, plus these collaborators.
  - Option (a), composing delegation there, would add a capability nothing asks for.
- Done: the design's composition section, with a test that composes the application host and asserts each answer. `walkthrough.py --check` passes.
- ARCH-REV-025 (2026-11-11): Pass, no finding. Its note is applied in the composition section: the root's application-root refusal (`delegationSource`) is answered before `UnavailableTaskDelegation`'s text, so an agent reads today's text, and the test asserts the exact text.
- SR-051 (2026-11-11), a correction after the Implementation Engineer read the code. ARCH-REV-025's note, applied at SR-050, assumed that an application-root refusal is answered first today. It is not. At `827f1e68dc` every application-host `delegate_task` is answered `TASKS_UNAVAILABLE_TEXT` right after the identity check, before any placement or other refusal. The application-bound rule lives inside placement, and `UNAVAILABLE_APPLICATION_ROOT` belongs to the `@` list only. The note's aim, that an agent reads today's text, is kept by today's order: the identity check, then `UnavailableTaskDelegation` answering `TASKS_UNAVAILABLE_TEXT` to every call. The composition section is corrected.

### SR-052 — The application host composes the same steps as the studio (replaces SR-050 and SR-051)

- Triggering: ARCH-REV-026 passed SR-051 but corrected its evidence. `delegateThrough` does not exist at `827f1e68dc`. At base the application host binds the Task resources and runs the hosting lifecycle, so an application-owned run's `delegate_task` is refused at placement (`collaborator-admission.ts:112`), not with `TASKS_UNAVAILABLE_TEXT`. The reviewer asked for a base-revision test of the exact text.
- Read: application-owned teams exist (`decodeApplicationOwnedTeam`), and team members are offered `delegate_task`. At base their delegations are refused with base's texts: self, own team, or `delegationTargetUnavailableMessage` for a catalog address (the app-bound catalog is empty). A run in the application host that is not application-bound can delegate at base.
- The Solution Designer's error: SR-050 and SR-051 took the branch's behavior, null lookups because the branch never composed delegation in the application host, for today's behavior. That behavior was this ticket's regression.
- Decision: **the application host composes the same steps 1–8 as the studio**, through the same composition file (the Implementation Engineer's option (a)). Base's behavior then holds by construction: the application-bound rule refuses where it lives, in placement, with base's texts, and a non-application run delegates as at base. `UnavailableTaskDelegation` and the null collaborators of SR-050 are withdrawn.
- Done: the design's composition section, with tests: a characterization test at `827f1e68dc` of the exact texts, the same texts asserted in the branch, and a non-application run's delegation and closure in the application host.
- ARCH-REV-027 (2026-11-11): Pass, no finding. Its note is applied in the composition section: where the application host lacks a studio piece, its real equivalent is passed explicitly (an empty stream session registry, or the peer channel absent as at base), never a lookup.

### SR-053 — The run services take a narrow Task port; the cycle through `ProjectTaskService` is split (the Implementation Engineer's finding)

- Triggering: the Implementation Engineer found a second cycle in SR-047's order.
  - The run services (step 3) take `TaskExecutionResourcePort`, whose only implementation is `ProjectTaskService` (step 5).
  - `ProjectTaskService` takes the closure stop and the worker status, which are `TaskRunControl` (step 4), which needs the run services.
  - The engineer proposed (a) a `TaskClosureListener` set at step 4 that fails when unset, or (b) `setRunControl`.
- Decision (on the merits; Principle 16 and Example 9, "split out what both need"): neither. Both are late bindings that hide the cycle.
  - Since SR-049 a root does not delegate. Linking, `markStarted`, the Project folder, `resolveAssignment` and `describeTask` are `TaskDelegation`'s, at step 6.
  - So a root needs only `isOpen(run)`, for the gate-head and work-packet checks, and `statusChanged(run)`, for the worker status notice.
  - The run services receive a **narrow `RunTaskRecords` port**, implemented by step 1's records and the Task change marks, both created before them.
  - The full port, `ProjectTaskService`, is created at step 5 with `TaskRunControl` passed in directly, and serves `TaskDelegation` and the cross-run owners at step 6.

  Every dependency points to an earlier step.
- Done: the design's composition steps 3, 5 and 6, with the reason. If a root use of the full port remains beyond `isOpen` and `statusChanged`, the Implementation Engineer reports it, and it either moves to the delegation owners or joins the narrow port, if it is a records read.

- ARCH-REV-028 (2026-11-11): Pass, no finding. The narrow `RunTaskRecords` port is Principle 16's resolution; `isOpen` reads the same records `ProjectTaskService` wraps, so the gate-head re-check reads the authority (AR-017) and the records keep one owner.

### SR-054 — The contract corrected to today's results (answers CRR-008 Requirement Gaps CR-461-012 and CR-461-013); the org story's real path

- Triggering: the code review's failure-origin review of API/E2E (CRR-008) found two Requirement Gaps, places where the contract disagreed with REQ-009 ("today's results and texts") while the code kept today's behavior. It also raised a question on CR-461-009.
  - **CR-461-012:** the contract said every delivered message returns "Delivered message to <address or run ID>." Today a run-ID delivery returns "Message delivered." (`send-message-to-tool-result-contract.ts:32`), and a delivery to another node returns `Delivered message to <run ID> on node "<peer>".` (`remote-refusal-codes.ts` `remoteDeliveredText`).
  - **CR-461-013:** contract S17 gave a saved Task to a peer node, which today is refused (`remote-refusal-codes.ts:31`, "A saved Task (task_id) can't be given to an agent on another node yet …").
  - **CR-461-009's question:** if the definition validator refuses a team definition with a handoff outside it, what product path creates such a team?
- The Solution Designer's errors:
  - the model's delivery text was one line for all three cases;
  - the peer story used a saved Task;
  - the model printed `delegate_task` refusals in `send_message_to`'s shape, where today's is `{ delegated: false, message }` (`root-task-dispatch.ts:101`, `task-delegation-target.ts:18`), found while fixing;
  - the org story delegated a catalog "Study Group" team whose saved definition handed off outside itself, which the definition check does not admit.
- Decision: **the contract follows today's results and texts (REQ-009), with no change to intended behavior.**
  - The model gives the three delivery texts, the peer saved-Task refusal, and the delegate refusal shape.
  - The peer story delegates by description (S17, a Task with no Project), closes it by its ID (S19), and shows the saved-Task refusal (S25).
  - The org story now uses the real path to an outside handoff: an org agent delegates to the org's own in-run mounted team (`/dev_team`), whose copy carries the org's handoffs from its members, made team-local, with the outside `to` (`/ceo_agent`) kept (O5–O7). That copy is how the 2 legacy teams with an outside handoff came about.
  - The design's compiler row names when it keeps an outside `to` (planning a delegated team), and keeps the validator's and a user-started team's check.
- Done: `model.py`, `stories.py`, `walkthrough.py`; the walkthrough regenerated; contract §5.0 (rules and runs), §3.2's example, §5.4.1 B-4 and B-5; the design's compiler row and test. `walkthrough.py --check` passes, and the examples have 0 findings.
- Approval: these correct the contract to the approved requirements (REQ-009) and change no intended behavior. The user is informed.
- The three Local Fixes of CRR-008 (CR-461-009, CR-461-010, CR-461-011) are the Implementation Engineer's.

- ARCH-REV-029 (2026-11-12): Pass, no finding. The texts and the refusal were verified at `827f1e68dc`, and the org story follows a real path. `walkthrough.py --check` passes, and the example validator has 0 findings.

### SR-055 — The listed-runs poll serves every delegating kind and carries the rows (answers CRR-012 Design Impact CR-461-021)

- Triggering: the code review's failure-origin review of API/E2E round 2 (CRR-012) found CR-461-021. A team or org that is listed but not open never lists its delegated runs: phone MSP-38 and MSP-39 list only the manager, while MSP-37 (an agent root) passes. That fails REQ-002 ("shown under the run that delegated it … in the desktop and phone layouts") and DS-11.
  - The design gave listed runs that are not open one source of child rows, the history poll, which serves standalone agent runs only (`agent-run-collaboration.ts:63-90`).
  - A team's or org's list rows come from its own stored members (`mobileRunTreeProjection.ts` `teamRowsOf`). Child rows are built only for an open team (`runHistoryNavigationProjection.ts:202`).
  - At base, copies were hosted in the team's or org's tree, and removing hosting took that source away.
- The Solution Designer's gap: SR-040 inventoried the poll for the agent-run hub only. The list rows of team and org delegators are another derived consumer of the removed hosting.
- Decision (spine first: one capability, one path, Trigger "Several kinds or forms"):
  - **One poll, `runCollaborationStatuses(runs)`, for every kind**, replaces `agentRunCollaborationStatuses`. Its answer carries each open local child's **row record, built by the view's own projection function** (the one the view and `ChildRowsFeed` use), with its agents' statuses.
  - The web builds the delegated rows of every listed run that is not open from that answer, desktop and phone. The open run keeps its live stream.
  - Because the answer carries the rows, the per-change view re-read of SR-040 and SR-041 is no longer needed, and is withdrawn. One projection serves the view, the feed and the poll, so the list and the open view agree by construction.
- Done: the design's DS-8 poll section (server, web, tests). `walkthrough.py --check` passes (views are not in the model).
- The four Local Fixes of CRR-012 (CR-461-017, -018, -019, -020) are the Implementation Engineer's.
- Next action: architecture review (narrow)
- ARCH-REV-030 (2026-11-12): Pass, no finding. Its cost note is applied in DS-8: the row records take a child's address and members from the `DelegationTree`'s per-run data, read once, never from a file per child per poll.

### SR-056 — The row projection is split by data lifetime (the Implementation Engineer's question on SR-055)

- Triggering: the Implementation Engineer. DS-8 asked the poll's row to be built by the view's projection function (`delegatedChildDto` → `projectDelegatedAgentRun` / `projectDelegatedTeamRun`), and, per ARCH-REV-030, from the tree's per-run data read once. That function builds the full row, including `source` (each agent's launch), from the child's own file on every call, and a Settings save (SR-039) rewrites the launch. A cached whole row would go stale in the open view; a fresh one would read a file per child per poll.
- Decision (on the merits, by data lifetime; the engineer's option (a)):
  - **The identity**, fixed for the run's life (address, run reference, members with addresses, delegator, `startedAt`, definition IDs), is built by one shared function from the tree's per-run data, read once.
  - **The view's part** adds `source`, read fresh from the child's file when a snapshot or feed event is built, as today.
  - The poll's `row` is the identity, which is all the run list reads. The view and the list agree by construction through the shared builder, and the launch is never cached.
  - Option (b), invalidating a cached row on a save, needs a new notice from the run services to the tree and an ordering point. Option (c) leaves the launch stale until a restart and breaks SR-039's reload.
- Done: the design's DS-8 poll section. `walkthrough.py --check` passes.
- The four CRR-012 Local Fixes are committed by the Implementation Engineer (`e208080b3c`, `b6ea7d241c`, `438d64a85c`, `e423b15cff`).

- ARCH-REV-031 (2026-11-12): Pass, no finding. The reviewer corrects its ARCH-REV-030 premise (the launch is not fixed for the run's life), and verifies at `827f1e68dc` that the run list's delegated rows show no launch details, so identity-only rows lose nothing. `walkthrough.py --check` passes.

### SR-057 — A listed run's peer children are in the poll's answer (answers CRR-013 Design Impact CR-461-027)

- Triggering: code review round 8 (CRR-013, a full review of the whole change) found CR-461-027. A listed, not-open run no longer shows its peer children: SR-055's answer carried local children only (`RunViewChildren.listed` filters `nodeId === undefined`), and SR-055 withdrew the stored-view read that used to show them. That fails REQ-002 ("whoever delegated it") and autobyteus-278's peer rows, which REQ-009 keeps.
- The Solution Designer's gap: SR-055 left peer children out of the answer and withdrew their only list source.
- Read: at base, a listed run's peer rows came from its stored link (`remote_task_executions`). Their statuses came only from `remote_task_execution_summary` events while a view streamed (`applyRemoteSummaryStatuses`), else the agent's offline default.
- Decision (the reviewer's option, as at base): the poll's answer includes each peer child, with its identity from `DelegationTree.peerChildrenOf(X)`, which reads the Task entry's `nodeId`, `recipientAddress`, `members`, delegator and `linkedAt` from memory, and **no statuses**. No request goes to a peer per poll. The web shows the peer row under its delegator, marked with its node, without a live status, as at base. The open view keeps the remote observation for live peer statuses.
- Done: the design's DS-8 poll section and its test. `walkthrough.py --check` passes.
- The five Local Fixes of CRR-013 (CR-461-022 … -026) are the Implementation Engineer's.

- ARCH-REV-032 (2026-11-12): Pass, no finding. The reviewer verified the premise at `827f1e68dc`: peer rows got titles and reachability only through a root's stream, so a listed, not-open run's peer rows had no live status at base either. `walkthrough.py --check` passes.

### SR-058 — Rows at every depth, and a delegated run's collaboration context derived from the data (answers CRR-016 Design Impacts CR-461-030 and CR-461-033)

- Triggering: the code review's failure-origin review of API/E2E round 3 (CRR-016) found two Design Impacts.
  - **CR-461-030:** a delegated run's prompt context isn't derived. A delegated agent run, now an ordinary standalone root, always gets the standalone role (`standalone-host-member-context-builder.ts:48`) and loses the task-agent sections. A copy at an org's configured agent address loses that address's handoff rules and the org's authored instruction (row 5). A member of a delegated team in an org loses the organization line (row 8). All of these came from hosting, against the non-goal "no change to what an agent reads".
  - **CR-461-033:** runs two levels down have no source of rows. The views and the poll carried one hop, and a child's own children were never read. At base, copies of copies were nested (REQ-002).
- The Solution Designer's gaps: both are derived consumers of the removed hosting, which the design did not inventory. The prompt context is read from where a copy was hosted, and nesting relied on the hosting tree.
- Decisions, both from the data model:
  - **The collaboration context:** one owner, `RunCollaborationContext`, asked by every kind's member context builder.
    - Role: task agent for an agent of a delegated agent run (its `delegatedFrom`).
    - The organization line: when the run's Task's assigner is an org, which is exactly when step 2 reaches the org.
    - A copy of an org's configured agent: when the run's `recipientAddress` is such an address, it inherits that address's handoff rules and the org's authored instruction, read at use from the delegating org's file through the tree. Nothing new is stored. A team copy keeps its handoffs in its own file (SR-054).
  - **Rows at every depth:** the view snapshot, the feed and the poll carry X's open subtree. Each row has its parent and delegator, so the one row builder nests it, and the feed reports to X and its ancestors. Peer rows are not expanded beyond their members, as at base. The team DTO's always-empty `task_executions` is removed.
- Done: the design's DS-8 ("Rows at every depth", "A delegated run's collaboration context"), with tests. `walkthrough.py --check` passes.
- The three Local Fixes of CRR-016 (CR-461-031, -032, -034) are the Implementation Engineer's.
- Next action: architecture review (narrow)
- ARCH-REV-033 (2026-11-12): Pass, no finding. Its wording note is applied: the DS-8 spine now names the open-subtree rule and SR-056's identity from the tree. The reviewer notes that contract revision 8's "one hop" applies to the stored edge only, so the two do not conflict.

### SR-059 — What a delegated run sees as in its run is what it reaches by address (the Implementation Engineer's Design Impact on CR-461-032)

- Triggering: the Implementation Engineer (IR-011). With CR-461-032 a child row's message and its `@` mentions go to the child's own root, but the note it composes differs from base for agents the child reaches only by address step 2:
  - CPW-M2: the agent the user started is offered "delegate the task to it", where base says "talk with it using send_message_to; you can't delegate to it";
  - CPW-M5: a team member, likewise.

  `CollaboratorAdmission.resolveMentions` reads only the resolving root's own in-run placements. At base the child was hosted in the delegator's root, so the delegator's agents were in the run.
- The Solution Designer's gap: the in-run set of mentions, the list and delegation is another derived consumer of hosting.
- Decision (on the data model's merits): **a run's in-run set is exactly what it reaches by address (§2.3)**:
  - step 1, its own team;
  - step 2, its Task's assigner's standing agents;
  - step 3, its own run's agents.

  One owner (`ReachableAgents`, beside `CrossRunAddressResolution`) computes it. The mention note, `list_available_agents` and `delegate_task`'s in-run placements read it, and the root port's read becomes async. The notes are then base's (`run_agent` / `in_run`), and what an agent is told it can talk with is exactly what it can reach. The delegation answers for these addresses are base's, captured by a characterization test at `827f1e68dc` (SR-052's method).
- Done: the design's "What a delegated run sees as in its run" (before DS-4), with tests. `walkthrough.py --check` passes; the model does not cover mentions or lists.
- ARCH-REV-034 (2026-11-12): Pass. Its two notes are applied in the design: one step-2 enumeration (`CrossRunAddressResolution` looks up `ReachableAgents`' address map; open Tasks in Task-ID order, else all, first match), §2.3's order for a definition at two addresses, and `addressesInUse` from the same set.

### SR-060 — The delegation tree as one tree per top run, and each run's collaboration map (the user's direction)

- Triggering: the user (2026-11-12). The old container's index was what the user sees as the collaboration tree, and made lookups direct ("you can use the agent ID to do the lookup directly"). Even without hosting, "there should be something like the similar … the individual ones which served from the earlier container could also be extracted from this … it serves a similar purpose." The Solution Designer agreed. Since design approval, almost every finding (CR-461-002, -021, -027, -030, -033, ARCH-REV-034 …) was a cross-run question the old index answered, rebuilt one at a time by a separate owner.
- Inventory (read at `827f1e68dc`): the three old indexes answer four kinds of question:
  - (A) looking up an agent;
  - (B) navigation, the copies and their chains;
  - (C) reach by address and CM-1;
  - (D) where a copy's memory lives.

  A run's own parts stay with its own index. The cross-run part of A, B and C goes to the new map, and D goes to each run's own root. The design has the method-by-method table.
- Decision:
  - The `DelegationTree` is **a forest, one tree per run the user started**, with `byAgentRunId` and `byRunId` for direct lookups. Each tree lives as long as its Task records, not as long as its top run, and holds no run's life.
  - **Each run's collaboration map** (`RunCollaborationMap`, from `mapOf(run)`) answers every cross-run question: reach (one enumeration), the addresses in use, the sender address shown, the nested rows, the collaboration context, `canMessage`, and the subtree.
  - The five separate owners fold into it: `CrossRunAddressResolution` keeps only the message route, and `ReachableAgents`, `RunCollaborationContext` and the separate row sources go.
- Done:
  - contract §4 (the structure, the map's questions);
  - `model.py` (each node's `tree`);
  - the walkthrough, regenerated;
  - the design's new section with the inventory.

  `walkthrough.py --check` passes, and the examples have 0 findings.
- Approval: the user's direction; no intended behavior changes. The map answers what the five owners answered, from one place.
- Next action: architecture review; then the Implementation Engineer folds the owners, and confirms every caller of the old index methods against the inventory
- ARCH-REV-035 (2026-11-12): Pass. Its notes are applied in the design:
  - a node's tree is derived by walking up, never stored, and a run whose own entries are deleted becomes a top with its subtree;
  - a test that the map and a loaded root agree on step 1, for a team and an org;
  - and, the optional note decided on the merits, `CrossRunAddressResolution` goes. It would only forward to the map (an empty layer, Principle 13); the dispatcher resolves through `mapOf(sender)`.

### SR-061 — The frontend contract: views in base's shapes, every run reached the same way; the names `DelegationIndex` and `CollaborationTree` (the user's direction)

- Triggering: the user (2026-11-12).
  - **On the changes:** "what user sees on the front end is not so much different … the same stuff is provided by the back end … So why did we make so much changes on the front end?"
  - **On the relay:** "I don't really see why it has to go through the delegator … the task agent or task agent team is also agent run … there's a standard approach … status … also a standard approach".
  - **On the view:** "the container is already the view … when a task is being delegated … it is constructing … a collaboration tree".
  - **On the names:** "collaboration tree … does look like a tree"; on the global structure: "I agree".
- Read: about 126 web source files change on the branch, most of them because the backend changed what it sends: new events, a new poll shape, removed fields, a relay of child commands through the delegator's view, and web row code. Only two web changes are real behavior: the view of a stopped run stays live, and a delegated run is addressed by its own identity. At base, going through the delegator followed from hosting, not from a choice. The web's standard paths for any run exist: `AgentStreamingService` and `TeamStreamingService` by run ID, and the run list's statuses.
- The Solution Designer's error: the data model was held fixed and validated, but the view contract was not. Each finding was fixed by changing what the backend sends and what the web does, so the web kept changing, with its own bugs, while nothing the user sees changed.
- Decision:
  - **Rule 1:** views and lists get base's shapes, built from each run's collaboration tree.
  - **Rule 2:** a delegated run is reached through its own standard path, and the delegator's view only shows rows.
  - **Rule 3:** a characterization at `827f1e68dc` per story is the acceptance check.
  - **Every earlier web-facing item** stays, goes or returns, item by item; the design's "The frontend contract" section has the table. The web keeps only three changes: the stopped run's live view, the delegated row bound to its own run, and idempotent `TASK_EXECUTION_STARTED`.
  - **The names:** `DelegationTree` becomes `DelegationIndex`, and `RunCollaborationMap` becomes `CollaborationTree` (`collaborationTreeOf(run)`), with the glossary note that the old stored file is removed.
  - **The trace pages' sender address** is `collaborationTreeOf(run).reachingAddressOf(sender)`.
- Done:
  - contract §4 (the names);
  - the model and the walkthrough, renamed and regenerated;
  - the design's new section, before DS-8, and the renames throughout.

  `walkthrough.py --check` passes. The Implementation Engineer was asked to hold the affected parts.
- Approval: the user's direction. Rule 2's one visible point, a delegated team's members' live statuses unselected, stays as at base (rule 1 projects them), so nothing the user sees changes.
- Next action: architecture review; then the Implementation Engineer, with the held CR-461-033 work rebased onto this

### SR-062 — One view sequence per run, owned by the view (answers ARCH-REV-036 AR-024)

- Triggering: ARCH-REV-036 accepted SR-061 except AR-024. Base's three clients take the row events inside the view's numbered stream, and a gap or an unnumbered frame forces a reopen. SR-061 returned those events "in base's shapes" but kept SR-044's unnumbered delivery; both cannot hold with base's web. The checkpoint reads raised the same question: whose sequence, and whose open work.
- Read: the checkpoints bracket a stored hydration, and the stream resumes at their `changeSequence` (`teamRunContextHydrationService.ts:358-372`, `agentOrgStreamingService.ts:490-505`). So the sequence must be shared by a run's stream and its checkpoint. The reviewer's option (a), a sequence per connection, would not serve the checkpoint.
- The Solution Designer's gap: SR-061 kept SR-044 without checking it against base's numbered clients.
- Decision (on the merits): **the view's sequence belongs to the view.**
  - One owner per run, `RunViewStream`, numbers every frame of its view in one order: the run's own events (its live root hands them over instead of numbering them), the tree's row events and the rows' status events. It exists whether or not the run is loaded.
  - Snapshots carry the base, connections get the frames after it, and a mode switch stays in the same sequence.
  - The checkpoint answers the view's sequence and the run's own open work.
  - SR-044's hold and idempotence are replaced, because a numbered stream gives "after the snapshot, in order, once". The web's changes drop to two.
- Done: the design's "The frontend contract" (sequencing, the SR-044 row, the web changes, tests). `walkthrough.py --check` passes.
- Next action: architecture review (AR-024)

### SR-063 — `RunViewStream` is base's `RootEventPublisher` moved out of the root (answers ARCH-REV-037 AR-025)

- Triggering: ARCH-REV-037 resolved AR-024 in substance (one sequence per run, outliving the root) and found AR-025. Base's owner of that sequence, `RootEventPublisher`, does three more things the web depends on, and SR-062 did not carry them:
  - **the snapshot barrier:** exact at base only because a root's own changes run in its gate, while the tree's row and status events run in no root's gate. So a row change during an async stored capture could appear twice in base's Team client, which inserts without deduplicating;
  - **`liveSequenceId`,** which keys the web's participant message positions;
  - **`lastMessageChangeSequence`.**
- The Solution Designer's gap: SR-062 named the sequence's owner without taking over the base owner's other duties.
- Decision:
  - `RunViewStream` **is** base's `RootEventPublisher` moved out of the root. It carries a `liveSequenceId` per instance, which lives as long as the process, so a stop and a restore share one live sequence and a restart starts another. It carries `lastMessageChangeSequence`, in the view's numbers, counting only the run's own message events. It carries its snapshot connection.
  - **The snapshot is made exact by the reviewer's option (i):** the view's base, the tree's rows and the observed statuses (all in memory) are read in one synchronous step. The run's own parts are captured as base did: in a live root's gate, with its queue; from the files for a stopped run, which produces no events. Every outside frame after the base is then a change after the snapshot, so no idempotence and no web change are needed.
- Done: the design's "The frontend contract" (the owner and its duties, the exact snapshot, the SR-044 row, tests). `walkthrough.py --check` passes.
- Next action: architecture review (AR-025). ARCH-REV-038 passed it. Its wording note was applied: DS-8 "Switching modes" now sends the in-band snapshot through the same snapshot connection, at the current view sequence and under the same `liveSequenceId`, not as a new base; "What this replaces" says the hold now lives in the snapshot connection.

### SR-064 — An agent run's own stream follows its run; a child's Settings save is composed by the web (answers IR-013)

- **Triggering:** the Implementation Engineer's IR-013. Two parts of rule 2 (SR-061) were left open.
  1. `AgentStreamHandler` binds a session only at connect, when the run is already active, or on the session's own send. A delegator's Task message restores a stopped delegated agent run, and a user watching that run's own stream would see no live output.
  2. DS-8's SR-039 item still described the server composition of the Settings save, which rule 2 removes.
- **The Solution Designer's gap:** SR-061 moved the delegated run onto its own stream without checking that this stream follows a run restored by someone else. It also left two DS-8 items unmarked as superseded: the child commands and the Settings save.
- **Decision 1, option (a), on the merits:** an agent stream session follows its run by run ID, the rule the team and org sessions already follow (SR-046).
  - It binds whenever the run becomes active, from the root lifecycle, before anything is posted to the run. It unbinds when the run stops.
  - Binding is idempotent.
  - The web is unchanged.
  - Option (b), a web reconnect on the row's status, was rejected: it depends on timing, and it would put a relationship-specific rule into the web, against rule 2.
- **Decision 2:** the Settings save keeps SR-039's behavior: check first, apply in row order, report a partial failure. The editor now composes it from each run's own stopped-run save. The server's `updateDelegatedLaunchSelections`, `DelegatedLaunchSelectionService`, `DelegatedChildLaunches` and `stopDelegatedExecution` are removed. A child that starts after the check is refused by its own save (`RUN_ACTIVE`) and reported as the failure.
- **No requirement change:** the intended behavior is unchanged.
- **Done:**
  - rule 2 gains both paragraphs, with tests;
  - the two DS-8 items are marked as superseded;
  - the revision line is updated.
- **Next action:** architecture review, together with SR-065. *Corrected:* at first the Solution Designer sent this only to the Implementation Engineer, reasoning that it followed from rule 2. The user pointed out that a server behavior change in a High-risk package goes to architecture review.

### SR-065 — A peer child keeps base's route; each local child's model options come from its own queries (answers the IR-013 follow-up)

- **Triggering:** the Implementation Engineer's follow-up to SR-064. The removal list also covered two things beyond local children:
  1. A peer child's Stop has no route except `stopDelegatedExecution` → the delegator's root → `stopRemoteChild` (autobyteus-278 DEC-804).
  2. The children's model options were served by `DelegatedChildLaunches.modelOptions`.
- **The Solution Designer's gap:** SR-061 and SR-064 wrote rule 2 for runs on this node, and did not say what happens to a child on a peer node, which has no standard path here.
- **Decision:**
  - Rule 2 covers runs on this node. A peer child keeps base's route through its delegator's peer link.
  - Its Stop stays on `stopDelegatedExecution`, narrowed to peer rows. A local reference is refused as `NOT_FOUND`. A stopped delegator is refused with `ROOT_NOT_ACTIVE`, as at base.
  - The service shrinks to that route and is renamed `PeerChildStop`.
  - The editor reads each local child's model options with that run's own queries (`AgentRunModelOptions`, `TeamRunModelOptions`).
  - `delegatedLaunchModelOptions`, `updateDelegatedLaunchSelections` and `DelegatedChildLaunches` are removed.
- **No requirement change:** a peer child's Stop behaves as at base.
- **Done:** a paragraph under rule 2 with tests, and the corrected removal-plan row.
- **Next action:** architecture review, together with SR-064.
- **ARCH-REV-039 passed SR-064 and SR-065.** Its notes were applied:
  1. A peer child's message and interrupt keep base's `executeRemoteChildCommand` branch in the three roots. Removing `DelegatedRunCommands` removes only the local route.
  2. Line references: `stopRemoteChild` is at `:59` at base, and the hook is `onHostReady`.
  3. One binding source: the root's `onHostReady`, with the root found through registration, as `StandalonePairedAgentAccess` does. The round-38 note, the in-band snapshot not being a new base, was already applied in 27d6f014b9 (DS-8 "Switching modes").

### SR-066 — A peer child is reached by its own identity, never through its delegator (the user's direction; REQ-013)

- **Triggering:** the user, relayed by the architecture reviewer after ARCH-REV-039: "the peer … task agent or task agent team are like the local task agent or agent team. It shouldn't be belonging to the delegate, shouldn't also go through the delegate". SR-065 had kept base's route through the delegator's root, and base's `ROOT_NOT_ACTIVE` with it.
- **Classification:** a requirement change, because the intended behavior changes. With the delegator stopped, a peer child's Stop, message, interrupt, conversation and live status now work. REQ-013 and AC-016 were added and approved by the Solution Designer within the user's explicit direction; the user was informed. Scope: in this ticket, because a stopped delegator with working children is this ticket's normal case.
- **Evidence** (base `827f1e68dc`, confirmed by the Solution Designer):
  - the channel is per process (`remote-run-channel.ts:125`);
  - a command is `ownerCommand(nodeId, targetRoot, agentRunId, command)` (`:106`);
  - node B admits it by the back-link (`remote-run-links.ts:144`);
  - the root served only to look up `(nodeId, target)`, which the `DelegationIndex` already holds (`peerChildrenOf`).
- **Decision:**
  - **A peer run is an object, `PeerAgentRun` or `PeerTeamRun`** (the user's decision, 2026-11-12, after the Solution Designer proposed it). Each is a stateless handle built from the tree's `PeerRunLink` and the process channel, with the methods `terminate`, `postMessage`, `interrupt`, `readConversation` and `observe`. `peerRunOf(runId)` finds one through the `DelegationIndex`, without a root. They mirror the local run's names and share no base class with it. This replaces a first draft's run-ID service, `PeerRuns`.
  - Stop is the standard terminate by run ID for every row. The run services call the handle's `terminate()`, so the Stop button has one path.
  - The web keeps base's shapes for a peer row's commands and conversation; the server calls the handle.
  - `PeerChildObservation` on the view side keeps a stopped delegator's peer rows live, inside the view's sequence and snapshot (SR-063).
  - Removed: `stopDelegatedExecution`, `PeerChildStop`, `DelegatedLaunchSelectionService`, and the roots' user-command remote branches and root-opened child observation.
  - The agents' own collaboration with a peer run stays in the roots. There is no protocol change.
- **Kept from SR-065:** each local child's model options come from its own queries.
- **Next action:** architecture review.
- **ARCH-REV-040 passed SR-066.** Its notes were applied: one shared `observe` per peer run across the open views, reference-counted, with each view numbering the frames in its own sequence; and one `PeerRunLink` builder (`peerRunLinksOf`) for `peerRunOf` and the roots.

### SR-067 — Every data-flow spine walked for every case (the user's instruction)

- **Triggering:** the user asked whether each complete data-flow spine had been validated for each case, and then said: "you should validate each data flow spine for each case because this is the way for you to validate by yourself whether your design holds or not".
- **The Solution Designer's gap:** the spines had last been walked at contract revision 5, and only for whether each spine's data exists. The spine list was stale: DS-8 said one hop, and Settings, archive/delete and peer-started runs had no spine. The runtime and view paths had been checked revision by revision, never case by case.
- **Done:** `evidence/spine-validation/spine-walk-2026-11-12.md` walks 19 spines (DS-1 … DS-14, with DS-8 in six parts) through their owners for every delegator kind, delegated kind, node and run state.
- **Found and answered:**
  - **G-1:** the archive/delete guard skipped working peer runs. It now asks each one through its handle's `status()`. An unreachable node does not block, and the result names that run.
  - **G-2:** a deleted run stayed in the `DelegationIndex`, so its delegated runs still reached its agents, and the views disagreed with the list. Now `runDeleted` drops it from the tree, with the Task records kept. The model gains run deletion (S26, S27; contract T-5 with peers, T-8, R-11, §4), and the independent validator applies the same rule.
  - **G-3:** an agent stream that connects after the run's registration now takes the current root at connect.
  - **Stale design text:** the DS-8 head line, the SR-044 paragraph and the poll query are corrected or marked superseded.
- **Requirements:** AC-008 now names peer runs (REQ-007 with REQ-013) and the reach after a delete. This is within the approved direction, and the user is informed.
- **Checks:**
  - `walkthrough.py --check`: three "match" lines, 43 states;
  - `validate_contract_examples.py`: 0 findings.
- **Next action:** architecture review.
- **ARCH-REV-041 passed SR-067.** Its note is applied: `runDeleted` is called before the files are removed, and the startup build re-adds a run whose removal failed. A restore that meets a run with no files, which happens to a message already past the tree, answers R-11.

### SR-068 — `hasCollaboration` returns on the agent run history item (answers IR-013, codegen)

- **Triggering:** the Implementation Engineer's codegen check of base's web against the branch's server. Base's web needs `hasCollaboration` to show a listed, not-open agent run's delegated rows (`RunListRow` / `RunDefinitionGroups` → `AgentRunTaskRows` → `ensureStoredView`; `useMobileRunTree.ts:61`). SR-061's item table listed it as "stay removed".
- **The Solution Designer's gap:** the table contradicted the contract. §3.5 and the model (S1) keep the stored flag, set by the first delegation, and the branch's history row still stores it. Only the API field had gone.
- **Decision:** it returns on the agent run history item, read from the stored row, as at base (rule 1, rule 3). The engineer's option (a) is taken, but sourced from the stored flag rather than the tree, because the contract records it there. Option (b), one view read per listed run, was rejected.
- **The engineer's other codegen items are confirmed:**
  - `closed_task_executions` on the org history read and `agentRunCollaborationStatuses` return, under rule 1;
  - `isTaskTeam` / `startedByAgentName` stay removed;
  - `TaskRoot.hostRoot` → `delegatingRun` is the contract's rename;
  - the standalone member file-change and trace queries stay removed: rule 2 reads a local child by its own identity, and a peer's files stay on its node.
- **Requirements:** unchanged.
- **Next action:** architecture review.
- **ARCH-REV-042 passed SR-068.** Its note is applied: item 2 of "What the web still changes" names a delegated row's file-change and trace panels, read by the run's own identity. The two web queries through the delegator are deleted.

### SR-069 — A peer run takes no `@` mentions, as at base (answers CR-461-035)

- **Triggering:** CRR-017's Design Impact. The branch refuses a peer row's mentions (`REMOTE_RUN_MENTIONS_UNSUPPORTED`), and the review read base as composing the note and delivering. SR-066 did not say how a peer row's mentions resolve.
- **Evidence at `827f1e68dc`:**
  - the web gives a run on another node no mention scope (`useComposerTarget.ts:69`, autobyteus-278 REQ-808, text-only);
  - base's probe asserts that `@` opens no menu there (`remote-runs-in-tree-probe.mjs:357-360`);
  - on the server, `resolveCollaboratorMentions` looked the focused agent up in the root's index, which holds no peer agents, so a mention was refused with `RUN_NOT_FOUND` (`root-team-run.ts:292-298`; the standalone and org paths alike).
- **Decision:** no behavior change, so no user approval is needed. A peer run takes no mentions, as at base. The explicit refusal stays, as a guard with a clearer text. The design names it under SR-066's peer paragraph, with a characterization test.
- **The Solution Designer's gap:** SR-066 routed a peer row's message without stating its mention rule.
- **Next action:**
  - architecture review (narrow);
  - the code reviewer's Local Fixes CR-461-036 and -037 go to the Implementation Engineer now.

### SR-070 — The user's message to a delegated run; the closed-Task input fence restored (DS-15, G-4)

- **Triggering:** the user asked for the data-flow spine of a user's message to a task agent or a task agent team member. Walking it found G-4.
- **G-4, the evidence:**
  - at base, every input to a hosted copy, the user's included, passed `taskExecutions.assertInputAllowed` and was refused when the copy's Task was closed (`configured-agent-execution-handle.ts:142-155`; `standalone-agent-run-root.ts:240-243`; `root-team-run.ts:210-213`, all at `827f1e68dc`);
  - on the branch, the team's fence only requires an active root (`team-root-materializer.ts:76`), and the standalone root has none;
  - so a user's message would revive a closed delegated run, which can now be reached from its Task's page. That is against REQ-005 and rule 3.
- **The Solution Designer's gap:** the SR-067 walk covered agent messages (DS-2, with the gate-head re-check) but not the user's input to a delegated run. That had no spine.
- **Decision:** each run's own root checks the Task side in its gate before restoring. A run with a Task entry whose current entry is closed refuses with base's text. A run no Task names is not fenced. This covers user input, application input and restart resume, as at base. DS-15 is added with tests.
- **Requirements:** unchanged; this restores REQ-005.
- **Next action:**
  - architecture review;
  - then the Implementation Engineer.
- **ARCH-REV-044 passed SR-070.** Its note is applied: the fence is checked before the root is resolved or restored (in the run's service where input enters), and again at the gate head for a loaded run. The test asserts no registration change, no status frame and no stream binding on a refusal.
- **SR-070 text corrected** (the Implementation Engineer's IMP-58 characterization): at base the user's input to a closed copy got the input-fence text, "Your Task is DONE or CANCELLED, so you can't start new work." (`TASK_AGENT_RESOURCE_CLOSED`). `ASSIGNER_ONLY_REACTIVATION_MESSAGE` was only for an agent's message to a closed run. DS-15 now names base's input-fence text. The Solution Designer had cited the wrong one of the two base texts.

### SR-071 — Refusals in base's order, codes and texts (answers CRR-021's Requirement Gaps CR-461-045, -046)

- **Triggering:** API/E2E round 4 (F-18, F-19), classified by the code reviewer as Requirement Gaps: the contract left the order of R-7 and R-8 open, and did not settle R-9's texts against REQ-009's "the same results and texts".
- **Evidence at `827f1e68dc`:**
  - base answered a closed target before the Task scope (`root-task-execution-lifecycle.ts:306-313`);
  - it answered a team run's ID with `TARGET_IS_TEAM_RUN` and the coordinator's run ID (`global-agent-run-message-router.ts`, `findTeamCoordinator`);
  - it answered `delegate_task` to a team member's ID with "… is not one of your task agents …" (`API-E01-r4-findings-F16-F20.txt`).
- **The Solution Designer's gap:** the contract and the model checked R-7 before R-8, and the model's S20 showed that wrong order as its R-7 example. There was no case for a team run's ID.
- **Decision** (base behavior, under REQ-009 and the non-goal, so no user decision is needed):
  - the order is R-6, then R-8, then R-7;
  - R-12: a team run's ID gets the coordinator's run ID, whether the team runs or not;
  - `delegate_task` refusals keep base's texts.
- **Done:**
  - contract §2.2 (the order), R-7, R-8 and R-12;
  - model: `_admit` order, team run ID; story S20 retitled (now R-8), new U9 (R-7) and U10 (R-12);
  - walkthrough regenerated, 45 states;
  - the design's refusal paragraph under DS-2.
- **Checks:**
  - `walkthrough.py --check`: three "match" lines;
  - `validate_contract_examples.py`: 0 findings.
- **Next action:**
  - architecture review (narrow);
  - the Implementation Engineer.

### SR-072 — The Team tab's messages; CR-461-055's seven questions (answers CRR-024)

- **Triggering:** CRR-024, the failure-origin review of API/E2E round 5. It raised Design Impact CR-461-054 (F-26) and Requirement Gap CR-461-055 (F-23, F-24, F-27, F-30, F-31, F-36, K-13). Its six Local Fixes were released to the Implementation Engineer first, CR-461-048, the data loss, ahead of the rest.
- **CR-461-054, F-26, the Team tab's messages:**
  - **Evidence at base:** base composed the root's log with every task execution's own log (`composeMessageLogs` over `taskAgentLogOwners`).
  - **Decision:** the same composition over `subtreeOf(X)`, live through a node-level `RunMessagesFeed` published once per message at the receiver's commit, and snapshot-exact by base's queue and message-ID deduplication.
  - **The one accepted difference:** a refused message is never written, because the receiver re-checks before writing, so it is not shown.
  - **The Solution Designer's gap:** rule 1 named the rows (SR-058) but not the Team tab's messages, and TC-13 had split the logs.
- **CR-461-055:**
  - **F-23:** the assigner's message to a run whose Task is DONE is refused with R-8, the same for an agent run and a team's member.
    - Base gave a team copy's member "No running agent has the run id …", because a released copy had left its host root. That statement is false now: the run exists, and its Task is closed.
    - REQ-003 wakes a stopped run of an open Task, not of a closed one.
    - Model: S10.
  - **F-24:** a new Task for a run whose Tasks were all deleted is accepted from the delegator named in the run's own `delegatedFrom`, as base accepted it (REQ-009). TC-9 governs messages between unrelated runs, not this assignment, which relates them again. Model: U11.
  - **F-27:** a delegated run's runtime switch, from its own Settings, is accepted. This was already decided (DS-10 tests, AR-016: "eligible for the runtime switch"), and REQ-002 says it is configured like any run. Base refused it only because a hosted copy shared its host's runtime. No change.
  - **F-30:** "works" in T-5 and DS-13 means an open entry and not stopped: running, initializing or idle. The model already read it so (an open entry and not stopped). DS-13's guard now counts idle too, so its "stop it first" is true.
  - **F-31:** launch inheritance is one hop: from the immediate delegator's saved launch at delegation time. Base used the top run's saved edit because every copy shared the top root. Each run now owns its configuration (REQ-002, P6). **Flagged to the user as the one behavior change in this set.**
  - **F-36:** a peer team row's `coordinator_address` is its own-team address (`/lead`). That is TC-12 option 1, the user's decision, applied to peers by SR-030. Rule 1 keeps the shape, not the old prefixed value.
  - **K-13:** S23 and S24 are moved before S16, when E still works, because a stopped run cannot act. Their results are unchanged.
- **Requirements:** REQ-005 and REQ-009 are restored where the branch differed (F-23, F-24). F-31 is decided within the user's direction that each run is its own, and the user is informed.
- **Model:**
  - S10 now includes the assigner's refused message;
  - U11 is new;
  - S23 and S24 are moved;
  - contract: T-5 (works), R-8 (the assigner while DONE), and the follow-up Task and launch-inheritance rules;
  - 49 states.
- **Checks:**
  - `walkthrough.py --check`: three "match" lines;
  - the validator: 0 findings.
- **Next action:**
  - architecture review;
  - then the Implementation Engineer.
- **ARCH-REV-046 failed SR-072 on AR-026, which is now answered.** The snapshot's logs are read after the synchronous base step, behind the queue, with the queued message frames numbered after the base and deduplicated by message ID. The test covers a message committed during the read. The sequencing test's wording for `lastMessageChangeSequence` is aligned. The Solution Designer's gap: SR-072 placed the read before the base, which loses a message committed in between.
- **ARCH-REV-047 passed the AR-026 answer.** Its wording fix is applied: queued message frames are all delivered, and the client ignores a repeated message ID, as at base. None is dropped from the queue, because a dropped frame would leave a sequence gap.

### SR-073 — A listed team's or org's delegated rows show when it is opened, as at base (answers CR-461-053 F-32)

- **Triggering:** the Implementation Engineer, classifying F-32 (on the phone, a stopped team's delegated row is not shown under it) as Unclear.
- **Evidence:** at `827f1e68dc` and on the branch alike, the web builds a listed team's rows from its open context only (`runHistoryTeamExecutionRows.ts`, `runHistoryTeamRows.ts`), and unfolding a team loads nothing. The desktop's SDV-02 passed because the probe opened the team. A listed agent run shows its rows without opening, through `hasCollaboration`.
- **The Solution Designer's gap:** the history-poll item's test, "a listed, not-open team and org … show the child's row within one poll", was left standing when SR-061 returned base's queries. It described behavior base's web never had.
- **Decision (rule 3):** as at base. A listed team's or org's delegated rows show once its view is open, on both layouts. No new web behavior is added. The test line is withdrawn. F-32 becomes a probe change for API/E2E: MSP-51 opens the team first.
- **Requirements:** unchanged. REQ-002's "shown under the run that delegated it" holds in the open view and for agent runs in the list.
- **Next action:**
  - the Implementation Engineer;
  - API/E2E, through the code reviewer's route.

No architecture review: this restores base behavior and withdraws one test line.
- **F-23's text** (the Implementation Engineer's question): the assigner's message while its Task is DONE or CANCELLED gets base's Task-side text (`task-assignment-eligibility.ts:41` at `827f1e68dc`): "This Task is DONE. The agent that assigned it can set the Task to TODO or IN_PROGRESS and then message this run id again." Others get the closed text. The contract's R-8, the model (S10) and the walkthrough are updated. The e2e step behind F-23 was the R-6 continuation after a reopen, so its expectation changes; there is no code change.

### SR-074 — The Team tab: one in-view rule for the read and for live (answers CR-461-056)

- **Triggering:** CRR-025's Design Impact, raised by the Implementation Engineer. The read used base's `isMessageOfView`, while SR-072's live rule numbered a message in every view whose run set held either run. So a message between a run below X and X's delegator showed live, then vanished on reload.
- **Evidence at `827f1e68dc`:** `task-agent-message-logs.ts:133-147`. Base had one rule for the stored and loaded view: both agents in the tree, or one of them the run's own agent. The tree is the run's own agents plus its **open** delegated runs. Base composed the run's own log and its open delegated runs' logs.
- **The Solution Designer's gaps:**
  - SR-072 wrote a second inclusion rule for live (Principle 11);
  - SR-072 also said "open or closed" for the composed logs, where base composed only the open delegated runs; the closed runs' messages with the run's own agents stay through its own log.
- **Decision:**
  - one rule for both: base's `isMessageOfView(message, own(X), tree(X))`, with `tree(X)` = own plus X's open subtree, at every depth;
  - the read composes the logs of X and its open subtree;
  - live numbers a message in X's view only when the rule holds at that moment;
  - tests for the pair: a message to X's delegator is shown neither live nor on reload, and a two-hop message both.
- **Also:** the code reviewer's suggestion is adopted. CR-461-051's unreadable-record check runs before the root loads, using `RunOwnAgentsReader.delegationOf`, as ARCH-REV-044 placed DS-15's fence.
- **Requirements:** unchanged.
- **Next action:**
  - architecture review (narrow);
  - then the Implementation Engineer.
- **ARCH-REV-048 passed SR-074.** Its note is applied: the snapshot's log read and filter are bound to the `own(X)` and `tree(X)` taken in the synchronous step, the same set as its rows.
- **F-31 confirmed by the user** (2026-11-13): "the changes on the top … shouldn't be inherited or flowing down … the delegator and task agent, task agent team, they are independent". So the one-hop decision stands: a new delegated run copies its immediate delegator's saved launch once, when it is created. After that the runs are independent: an edit to a delegator never changes a run it already delegated to, nor reaches runs its descendants start. The flag is closed.

### SR-075 — CR-461-064's four questions (answers CRR-027)

- **Triggering:** CRR-027, the failure-origin review of API/E2E round 6. Its seven Local Fixes were released to the Implementation Engineer first, CR-461-057 (a lost message, a regression) ahead of the rest. Requirement Gap CR-461-064 had four questions. The rule used: base's behavior holds unless a requirement or a user decision changes it.
- **F-39, a team-level choice on a stopped delegated team:**
  - **Decision:** it is saved as for a team the user started. The team default changes, and each member keeps its own saved launch.
  - **Why:** REQ-006 decides it explicitly ("a stopped delegated run's settings are saved like any stopped run's"). Base's `followsTeam` existed only for hosted copies, and the migration applies any pending team-level choice once (DS-10, step 4).
  - **Flagged to the user:** this changes behavior for delegated teams.
- **F-40, a delegated run's `list_available_agents`:** its own definition is left out, as every run's is (autobyteus-455 AC-006; SR-037 in the approved non-goal exception). Base listed it only through its host's list, and then refused delegating to it.
- **F-41, a delegated run's error card:**
  - **Decision:** under rule 2, it is part of the run's own conversation, shown when its row is selected, in all three views.
  - **Rows:** each row shows the `error` status and message.
  - **What changes:** the Org view's missing card on selection, if it is missing, is a Local Fix. A delegator's own conversation carries no other run's card.
- **K-14, deleting M and its Task with no Project:** the Tasks with no Project that M assigned are removed with M, as base removes a deleted chat's Temp tasks (task-keys AC-021). The branch already does this. Project Tasks stay.
  - The model's `delete_run`, the contract's T-8 and S27's text are updated; S27 now removes T7.
- **Checks:**
  - `walkthrough.py --check`: three "match" lines;
  - the validator: 0 findings.
- **Next action:** the Implementation Engineer. API/E2E updates its expectations through the code reviewer's route: F-39 to the user-started rule, F-40 omitted, S27's T7.

No architecture review: these follow REQ-006, an approved exception, rule 2 and base.

### SR-076 — A message whose Task closes during its write: kept and shown, as at base (answers CR-461-060 TDR-001)

- **Triggering:** the Implementation Engineer's Unclear on CR-461-060, the TDR-001 part. A Task that closes during the receiver's durable write leaves the bytes on disk. Only the post-write check sees the closure, and an append-only log can't take the write back.
- **The Solution Designer's gap:** SR-072 said a refused message is never written, and accepted a difference from base. That holds for a refusal before the write, but this race can't be prevented without new coupling. Base kept and showed the record (469 REQ-012, `root-message-append.ts:43`); F-26 had first flagged exactly that message as missing.
- **Decision:** option (c), base's behavior.
  - A refusal before the write writes nothing.
  - A closure during the write keeps the record in the receiver's log, answers the sender with `TASK_AGENT_RESOURCE_CLOSED`, and the composed Team tab shows it.
  - Rejected: (a), the closure waiting on every run's log lock (it couples the Task side to each run), and (b), a refusal marker (a new record kind and new readers).
  - SR-072's accepted difference is withdrawn.
- **Requirements:** unchanged; base's behavior is kept.
- **Next action:** the Implementation Engineer. TDR-001's expectation changes: the refusal is answered and the record is shown.
- **The Implementation Engineer's closures, confirmed:**
  - **CR-461-063 (F-45)** was a model gap, like K-13. In S27 a stopped run acted. The story now has the user's message restore the research agent first, which clears its `terminatedAt` as for any run, and then it reports (R-11). The product's Stop records `terminatedAt`, as for any run.
  - **SR-075 F-41** needs no code change. The card is a live ERROR on the delegated run's own stream, and all three views bind a selected delegated row through one owner (`delegatedRunsStore`). The e2e reads it from the delegated team's own stream.
  - **CR-461-057** had a product cause (fixed in 573e6a7d07): the agent-run view's composer target fell back to the delegator while a selected delegated row's run was opening.
- **SR-076 follow-up (the Implementation Engineer):** with the record only in the receiver's log, the closing run left X's open subtree, and the reload lost it, which broke SR-074's one rule. **Decision: option (1).** On a refusal after the receiver's durable write, the sender also commits the message to its own log. A message in a receiver's log is then always in its sender's log (TC-13), and live and reload agree. Option (2), hiding it everywhere, was rejected: it reverses base, which showed it.

### SR-077 — CR-461-066: the model's S26, and a preserved copy's Settings (answers CRR-030)

- **Triggering:** CRR-030, the failure-origin review of API/E2E round 7 on the merged state. Its two reopened Local Fixes, CR-461-061 and -059, were released to the Implementation Engineer first.
- **K-15, a model error:**
  - S26 deleted a running M, but the product refuses that first, as at base ("Run is active. Terminate it before deleting history.");
  - the model also named a code, `RUN_DELEGATED_WORK_ACTIVE`, that the delete mutation's `{success, message}` result does not carry.
  - **Fixed:**
    - `delete_run` refuses an active run first, with base's text per kind;
    - the delegated-work refusal uses the mutation's shape;
    - S26 stops M, then deletes, and is refused for the working research agent;
    - S27 deletes the stopped M.
  - **The Solution Designer's gap:** the model's refusal used an invented shape, and skipped base's active-run rule.
- **Q-1, a copy preserved by a failed predecessor:**
  - **What happens:** it is not a run of its own until the predecessor's retry finishes the item. Its own save answers `NOT_FOUND`, and the host no longer edits it (rule 2).
  - **Decision:** this is the expected outcome. DS-10 preserves and reports such an item (`PRESERVED_UNFINISHED_PREDECESSOR`) and never half-converts it (`DESIGN.md` rule 7, the data guideline).
  - **The runner:** it continues past a failed migration (`app-data-migration-runner.ts:80-102`), so 461's migration still runs and reports the item.
  - The design states it under DS-10. TAU-2's expectation changes.
- **Checks:**
  - `walkthrough.py --check`: three "match" lines;
  - the validator: 0 findings.
- **Next action:** the Implementation Engineer, then the full code review.
- **K-15 confirmed by the user** (relayed by the code reviewer): a delegator must be stopped before its history can be deleted, as at base. The model's S26 already reflects it (SR-077, a1b060c7ec).

### SR-078 — A preserved copy's history row; an unconvertible root's answers (answers CRR-033's CR-461-068, -069)

- **Triggering:** CRR-033, the failure-origin review of API-REV-008. Its Local Fixes CR-461-070 and -071 were released to the Implementation Engineer first.
- **CR-461-068 (F-49):**
  - **(b) Design Impact:** SR-077 promised that a preserved copy becomes an ordinary run after its predecessor's retry. But our migration is terminal (warning success), and its step 8 never ran for the copy, so nothing creates its history row.
    - **Decision:** `ensureRunHistoryRow(run)` builds the row from the run's own file, as step 8 does, the first time a specific operation on that run needs it. This is a per-operation check, which the guideline keeps separate from startup.
    - **Rejected:**
      - retrying a terminal migration (guideline §6);
      - a startup pass over the corpus (guideline §6, and DS-10's own lessons);
      - withdrawing the promise (REQ-011).
  - **(a) Requirement Gap:** the save before the retry answers base's `INTERNAL_ERROR` "Run ownership could not be verified", which is base's answer for a run ID with no own file. SR-077's `NOT_FOUND` was wrong, and the expectation is corrected to base's answer.
  - **The Solution Designer's gap:** SR-077 stated a premise without checking it against the runner's terminal statuses and against what creates the row.
- **CR-461-069 (F-51):** a team or org root its migration could not convert.
  - The view connect asks base's restore admission before reading the file, and answers as base's view did (`TEAM_NOT_FOUND`).
  - The first message answers the admission's reason codes and texts (`TEAM_RUN_STATE_PACKAGE_NOT_CATALOGED`, `TOKEN_USAGE_EXISTING_RUN_RESTORE_MIGRATION_REQUIRED`), as base's restore mutation did.
  - No raw schema error reaches the user; the detail goes to the log only (rule 7).
  - **The Solution Designer's gap:** SR-046 removed the restore mutation without placing its admission answers.
- **Requirements:** unchanged.
- **Next action:**
  - architecture review (narrow);
  - then the Implementation Engineer.
- **ARCH-REV-049 failed SR-078 (b) on AR-027, now revised.**
  - **The problem:** `ensureRunHistoryRow` put a migration's residue repair into the runtime. Its triggers were an incomplete list, and it went against DS-10 item 6 and guideline §7.
  - **The revision:** a follow-up migration, `20261114_delegated_runs_preserved_items_v1`:
    - `requiredOnStartup`, with no `holdsBackCapabilities`;
    - its prerequisites are our main migration and 20261017, 20261018 and 20261019, and it is registered after them;
    - while a predecessor is `FAILED`, it waits, reported, and the node stays usable;
    - in the start where the predecessor finishes, it applies our steps 4, 5b and 8 to each preserved item, idempotently, then becomes terminal.
  - The runtime reads only the target. The Solution Designer added steps 4 and 5b to the reviewer's rows-only proposal, so that the finished item reaches the target shape and not only a row. Part (a) and CR-461-069 stand.
- **ARCH-REV-050 passed the AR-027 answer.** Its note is adopted: **one follow-up per predecessor** (20261017, 20261019 and 20261018), each with only its predecessor and our main migration as prerequisites, so a predecessor stuck `FAILED` for an unrelated item can't hold back another predecessor's finished items (REQ-011). The steps are split as each predecessor's items need: 4/5b/8, then 4/8, then 5b. There is a new test for the decoupling.
- **CRR-034 CR-461-073:** SR-078's two answers for an unconverted root couldn't both be reached. The connect answered `TEAM_NOT_FOUND` and closed the stream, so no first message could carry the reason. **Decision:** the connect answers with the admission's own code and text, then closes. Base's user saw the reason when sending, through a path that no longer exists (a stopped run's view is its stream, SR-045/046), so the connect is the only place the reason can reach the user. The web doesn't special-case `TEAM_NOT_FOUND`. The test is corrected. The first message keeps the reason for a run that passed admission. The Solution Designer's gap: SR-078 placed two answers without checking that the second could be reached.

### SR-079 — Every late predecessor, failed or waiting (answers CR-461-074)

- **Triggering:** CRR-036 (F-53). `20260901_agent_org_flat_team_families_v1` waits (`NOT_RUN`) behind a failed `token-usage-run-records-v1`, runs after our migration, and writes an org tree with a `taskExecutions` list that no follow-up converts.
- **The Solution Designer's gap:** SR-078 (c) covered only predecessors that are late because they are `FAILED`, and only the three that leave preserved copies. The registry's prerequisite chains, and the predecessors that write or read our shapes, were not checked.
- **Investigation:**
  - the registry (`app-data-migration-registry.ts:80-167`) and its prerequisites;
  - a search of every earlier migration's folder for our source shapes.

  The writers are 20261015, 20261017, 20261018, 20261019, team-run-execution-tree-v1, team-run-execution-tree-v2 and the flat-families migration. The reader is 20261020, which selects the improver's runs (F-25's class). The rebuilders are the two history-index v2 migrations.
- **Decision:**
  - classify every earlier migration;
  - give each writer and reader a follow-up from one definition, `PreservedItemsFollowUp(predecessor, steps)`, which waits while its predecessor is `FAILED` or `NOT_RUN`;
  - our main migration preserves items only for readers (the improver's delegated runs, while 20261020 is not terminal);
  - rebuilders need nothing; a test confirms it;
  - a registry test enforces that every earlier migration is classified.
- **Tests:**
  - the restart-retry scenario ends with no stored list;
  - a late 20261020 keeps the improver's copy;
  - the classification test;
  - a late index rebuild keeps the rows.
- **Requirements:** unchanged (REQ-011, rule 7).
- **Next action:**
  - architecture review;
  - then the Implementation Engineer, who confirms each classification against the code as the classification test is written.
- **ARCH-REV-052 passed SR-079.** Its notes are applied:
  1. **The address and path shapes are classified too.** `TeamAgentMemoryLayout` and `TeamCommunicationProjectionAddress` are expected to need nothing, to be verified by test. `TeamContextFileExecutionLocatorsV1` writes attachment owners with a member address that step 4 does not rebase. This may be a gap **on time as well as late**. If the runtime resolves owners by address, step 4 also rebases stored locators and that migration gets a follow-up. The Implementation Engineer verifies it, with a test that an existing delegated team member's attachment resolves. The classification test cites both searches.
  2. **The stale paragraph** "When a predecessor later finishes an item … inert" is replaced by a pointer to SR-078 (c) and SR-079.
- **The Implementation Engineer's classification check:**
  - `20260521_team_run_history_index_v2` is a writer, not a rebuilder. It keeps only teams with a `team_run_metadata.json`, which no current team has, and removes the delegated team rows step 8 added. **Decision:** it gets a step-8 follow-up for the delegated team runs.
  - Its removal of user-started team rows is base's behavior: FU-029, outside this ticket.
  - The three address and path migrations are verified as none: memory layout acts only on v1 roots; the locators skip converted files; the projection addresses feed 20261018, whose follow-up covers them.
  - The rest are confirmed.
- **The locators, confirmed none:** `TeamContextFileExecutionLocatorsV1` writes final locators by run ID (`team-context-file-locator-transition.ts:71`), and the runtime resolves them by `{teamRunId, agentRunId}` (`context-file-owner-resolver.ts:71-97`). No address is stored, so step 4's rebase doesn't affect a delegated team member's attachments.
- **CRR-039 F-55 wording:** DS-15 no longer says a closed run is reached from its Task's page, which lists it muted and not openable, as at base. It is reached when its own view was already open as its Task closed.

### SR-080 — The Task card opens its run in its tree's top view (answers the Implementation Engineer on CR-461-076)

- **Triggering:** CR-461-076 (F-54), the Task card's open path. The card must open its worker as the row does. A nested worker's row lives only in its tree's top view, and `TaskRootView` carried only the one-hop `delegatingRun`.
- **The Solution Designer's gap:** renaming `hostRoot` to `delegatingRun` changed its meaning from "the top" to "one hop" without keeping the top for the card, which base used.
- **Decision:**
  - add a derived `topRun` (`DelegationIndex.topOf`) to `TaskRootView`, carried on the GraphQL type, the change message and the web type;
  - the card opens `topRun` and selects the row there through that view's own selection;
  - `openable` follows it, and closed stays not openable;
  - a peer run is unchanged.
- **Why this needs no further review:** it is an addition to a view, not to stored data, and it restores base's behavior (rule 1). It is approved as part of the Local Fix, and code review sees it.

### The data migration guideline gains the ordering rules (the user's request, through the code reviewer)

- **Added:** `docs/design/data_migration_guideline.md` §4, "Registry order and late predecessors", as hard rules.
  - The registry is append-only: released entries never move, and a new migration goes at the end with a later date, enforced by the order test.
  - Every earlier migration that can run late (`FAILED`, or `NOT_RUN` behind a failed prerequisite) is classified as writer, reader, rebuilder or none, checked against the code. Writers and readers get follow-ups, and a test enforces the classification.
- **Also:** checklist item 6 points to the rules, and §10 gains two lessons, CR-461-048 (data loss) and CR-461-074 (half-converted data).
- **FU-027's scope** (whether the runner derives order and re-runs migrations) is left unchanged, as the user has not decided it.

### SR-081 — The old-name correction comes before address step 2 (answers CR-461-081)

- **Triggering:** CRR-043 (F-63, live LE-O1). In an Org, a delegated copy of the mounted `/squad` messaged `/squad/mate`. It reached the Org's **own** mounted mate, and the copy's mate never started. The code followed contract §2.3: the correction came after step 2 (ARCH-REV-011).
- **Decision:** the correction comes **before** step 2. An address under the run's own delegated name (its `recipientAddress`, or that name itself) means its own teammate, so it is corrected ("Use /mate"), never delivered to the assigning run's namesake agent. That agent stays reachable by its run ID.
- **Why:**
  - an agent of the copy writing its team's old name means its own team;
  - reaching another run's same-named agent is a silent delivery to the wrong agent;
  - ARCH-REV-011's concern, that the correction might hide an assigner's agent, applies only to an assigner agent named under the copy's own delegated name, which is exactly the misrouting case.
- **The Solution Designer's gap:** contract §2.3 took ARCH-REV-011's order without a case for a copy of a mounted team whose name equals the assigner's own team.
- **Model:**
  - `resolve` checks the correction before step 2;
  - new state O9: a copy's lead writes `/dev_team/qa` and gets "Use /qa";
  - O7's text is corrected;
  - contract §2.3 is updated.
- **Checks:** `--check` gives three "match" lines, and the validator 0 findings.
- **Requirements:** within the user's TC-12 / SR-035 decisions (a team at its own root; an old prefixed address is corrected). The user is informed.
- **Next action:**
  - architecture review (it reverses ARCH-REV-011's order);
  - then the Implementation Engineer. LE-O1 expects the correction.

### SR-082 — The run-tree view and statuses by run ID (the user's decision to fix the architecture in this ticket)

- **Triggering:** the code reviewer relayed the user's decision (2026-11-14): fix the architecture now instead of patching. FU-024, FU-026, FU-031 and FU-034 move into 461. About ten findings shared one cause: a delegated run's facts derived from its delegator.
  - the status relay: CR-461-039, -061, -067, -071;
  - the web reading or opening a child through its delegator: F-54, F-57, F-59, F-61, F-62, F-64;
  - and FU-024 / FU-031.
- **The user's direction to the Solution Designer:** "follow what the code reviewer told you … after you finish the design updates then tell me". So the Solution Designer took its recommendations on the three open points:
  1. replace base's shapes for run trees only;
  2. statuses by run ID through one channel, with trees carrying structure only;
  3. rerun everything that shows or opens runs and statuses, and regression runs for the rest.
- **Requirements:** REQ-014 and AC-017 added.
- **Design:** the new section "The run-tree view and statuses by run ID", which supersedes rule 1 for trees and statuses.
  - `RunTreeView`: one builder, rows with kind, name, address, depth, open target, status ids and launch; on the view stream and by `runTree(run)`;
  - `RunStatusService` with `/ws/run-status`;
  - one web open path, `openRunTarget`;
  - removals: the relay and its caches, the four client builders, the per-kind child DTOs, the status poll.
- **Absorbed:** CR-461-079, -080, -082 and -084 (peer `launches[]` on the row). Also the Implementation Engineer's F-62 finding (`isAgentLive`).
- **Still released:** CR-461-078; CR-461-083 if its fix is outside the view; SR-081.
- **The Solution Designer's gap:** SR-061's rule 1 kept base's tree shapes. That preserved the hosting-era derivations in the client and in the status relay. Rule 1 was right for avoiding frontend churn, and wrong for trees once each run is its own.
- **Next action:**
  - architecture review;
  - then the Implementation Engineer, in the stated order.
- **ARCH-REV-054 failed SR-082 on AR-028, now answered.**
  - **The problem:** a listed, expanded run that is not open lost its live tree changes, because base's poll had re-read on a child-set change.
  - **The mechanism:** `/ws/run-status` also carries `RUN_TREE_CHANGED { runId }` for a subscribed id whose tree changed, fed by `ChildRowsFeed` for the run and every ancestor. The client re-reads `runTree(run)` for an expanded run. There is a test for it.
  - **Notes applied:**
    - an exact `SUBSCRIBE` (read and register in one synchronous step);
    - counted lifetime, with a peer's `observe` released with its last subscriber;
    - rule 3: item 5's tests and AC-017 are the acceptance for trees and statuses.
- **ARCH-REV-055 passed the AR-028 answer.** Its notes are applied:
  - the four stale status passages (the peer cache, SR-063's status read, the SR-044 row, the Team tab's step 1) are marked superseded for statuses by SR-082;
  - on repeated `RUN_TREE_CHANGED`, the client applies only the newest `runTree` answer.

### SR-083 — SR-082 narrowed: statuses by run ID now; the full server tree stays FU-034

- **Triggering:** the user asked whether returning a server-built tree is worth it compared with keeping the current endpoints (`ListWorkspaceRunHistory` and the view reads). He said: "If you think the benefits is worth it then do it; if not, no."
- **The Solution Designer's judgment:**
  - **statuses by run ID** (FU-026) is worth it now: it removes the server-side relay class (CR-461-039, -061, -067, -071, F-62);
  - **the full server tree** (FU-034) is not worth it in this ticket. Its value, consistency between views, comes mostly from cheaper steps, and its cost is the largest web rewrite and browser re-run late in the ticket.
- **Decision:**
  - keep the current endpoints and shapes;
  - the server adds `openTarget` to every row it already builds: a team's target is its coordinator, with no `members[0]` (FU-024, FU-031);
  - a peer row carries its launch;
  - an edited member shows no origin;
  - one web open path, `openRunTarget`;
  - Settings' rows from the view and its liveness from the run's own status;
  - the focused-member load;
  - `RUN_TREE_CHANGED` on `/ws/run-status` re-reads the existing view read for an expanded listed run;
  - `RunTreeView` and `runTree(run)` are withdrawn;
  - FU-034 stays a follow-up.
- **Requirements:** REQ-014 is reworded. AC-017 stands, with "every view shows the same rows" now meeting the bar through the existing builders that only display.
- **Next action:**
  - architecture review (narrow);
  - then the Implementation Engineer, when the user lets him continue.
- **CR-461-083 (F-65), decided:** the refusal reaches the user (`TEAM_SEND_MESSAGE_REJECTED`, with the draft kept), but its reason was dropped by CR-461-069's no-detail rule. Decision: option (a), refined. The message names the damaged file and line in plain words, plus the next step. Parser and schema internals stay in the log. This refines CR-461-069's rule 7: a file name and line is a reason, not a schema error, and base's AC-006 asks for the reason. The probe's late `page.on('websocket')` and its parse-text condition are API/E2E's to fix.
- **V-11's "an edited member shows no origin" is refined** (the Implementation Engineer, SR-083 step 2). Removing the team fallback would mislabel followers and configured-placement members, and an absent source renders as "Not recorded". **Decision:** a changing Settings save writes `{ origin: "settings", fallbacks: [] }`, a new origin value, written by new writes only and with no migration. The web shows no origin for it; a member's own `"settings"` wins over the team fallback, and the fallback stays for everything else.

### SR-084 — The server-built run tree reinstated (the user's decision of 2026-11-15)

- **Triggering:** the code reviewer relayed the user's decision after rounds 13–14: build the run trees on the backend now (FU-034, as SR-082 designed it). Client code rebuilding a run's facts kept producing bugs: F-60 (Settings rows from stale records), F-69 (the hosted-copy follower path), F-73 (the phone's own projection), and earlier F-54, F-56, F-57, F-61, F-64. Statuses by run ID fixed that class for statuses (proven in rounds 13–14), but not for trees.
- **The Solution Designer's gap:** SR-083 judged the tree not worth its cost, and rounds 13–14 showed the client-side class continuing. The judgment underweighted how much client code still rebuilt run facts.
- **Decision:** SR-082's tree is reinstated.
  - `RunTreeView`, with `runTree(run)`, on the view stream, and `RUN_TREE_CHANGED` for listed runs. Rows carry kind, name, address, depth, `openTarget` from SR-083's `openTargetOf`, `statusIds`, and `launch` as the run has it now, including the `"settings"` origin.
  - `runLaunch` and the Settings row assembly fold into the rows.
  - Clients only display, with one open path.
  - The four builders are removed, with the follower path, the phone's projection and the Settings assembly.
  - Statuses stay on `/ws/run-status`, and the top level of the run list stays as it is.
- **CR-461-095** (Org Settings closing on an empty target) is folded in: Settings' target is a tree row key, kept through a refresh. CR-461-094, -096, -097 and -098 continue.
- **Requirements:** REQ-014 restored to the tree wording. AC-017 stands.
- **Follow-ups:** FU-034 is moved into 461 again.
- **Next action:**
  - architecture review (SR-082's tree parts were reviewed in ARCH-REV-054/055);
  - then the Implementation Engineer;
  - then API/E2E reruns everything that shows or opens runs.
- **ARCH-REV-057 passed SR-084.** Its notes are applied:
  - a row's `key` is built from identities only: kind plus run ID, plus the agent run ID for a member row, never position or depth;
  - SR-083's "FU-034 stays a follow-up" line in follow-ups.md is marked superseded.
