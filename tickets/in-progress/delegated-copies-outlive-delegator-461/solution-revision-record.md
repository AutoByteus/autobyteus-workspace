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

