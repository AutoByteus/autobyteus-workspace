# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial coherent baseline (Task `autobyteus-469`) | N/A | N/A | Ready for Approval | BEH-001 … BEH-007, REQ-001 … REQ-008 | Presented to the user; DEC-001 needs him |
| SR-002 | Requirements | The user's answer to DEC-001 | N/A | Ready for Approval | Approved | BEH-005, REQ-004, AC-011, DEC-001 | Approved; architecture investigation starts |
| SR-003 | Requirements and design | Architecture investigation | N/A | Requirements Approved; no design | Requirements Approved; design Ready | REQ-001, REQ-003, REQ-005, REQ-007, AC-001, AC-002, AC-009, AC-011, DEC-003, DEC-005 … DEC-007 | Sent to architecture review; withdrawn before a decision (see SR-004) |
| SR-004 | Requirements and design | The user's decisions DEC-009 and DEC-008 after the SR-003 handoff | N/A (the review of SR-003 was stopped without a report) | Requirements Approved at SR-003; design Ready (SR-003) | Requirements Approved; design Ready (SR-004) | REQ-001, REQ-003, REQ-007, AC-001, AC-005, AC-009, AC-010, QR-002, DEC-005, DEC-008 … DEC-010 | Design rebuilt; Large, High; to architecture review |

## Revision Entries

### SR-001 — An entry exists while its run's Task is open

- Phase and classification: Requirements, `Initial Baseline`
- Triggering user feedback, Product package, investigation evidence, or role/report/round: Task `autobyteus-469` (the user's ordering decision of 2026-11-10 in `autobyteus-461`); investigation notes of 2026-11-10
- Triggering finding IDs: N/A
- Prior authoritative requirements/design status: N/A
- Current authoritative requirements/design status: requirements `Ready for Approval`; no design
- Requirement, behavior, acceptance-criteria, scenario or decision IDs affected: BEH-001 … BEH-007, REQ-001 … REQ-008, AC-001 … AC-012, SCN-001 … SCN-006, DEC-001 … DEC-004
- Scenario-basis or scenario-validity changes: first basis; all Supported Normal Scenarios
- Why this baseline or revision was recorded: first baseline for the user's approval
- Canonical requirements, investigation and design sections changed: `requirements-doc.md` and `investigation-notes.md` created
- Supplemental artifacts added, changed or removed: none of this ticket (the 461 contract's §11 and §12 are referenced)
- Product design evidence or product decisions incorporated: none
- Intended behavior changed: `Yes` (proposed)
- Approval impact, exact approved requirements baseline, who approved, and approval reference: not approved; DEC-001 (the Team tab) is a visible effect the Task does not settle. DEC-002 (the Memory page) is settled by the Task's "must keep working"
- Behavior-defining supplement versions and approval references: none
- Affected design/review basis invalidated or rebuilt: N/A
- Post-design task-size/risk classification and rationale changes: N/A
- Applied handoff-rule outcome / result-file reference, when a handoff occurred: none (approval hold in the Solution Designer's conversation with the user)
- Downstream and architecture-review impact: none yet
- Remaining gaps, assumptions or blocked decisions: DEC-001; notes R-001, U-001, U-002
- Next action: the user answers DEC-001; then architecture investigation and design

### SR-002 — No visible change: the Team tab keeps every message

- Phase and classification: Requirements, `Approval`
- Triggering user feedback, Product package, investigation evidence, or role/report/round: the user, 2026-11-10: "this ticket is just about the collaboration tree itself ... this file should only contain the current active ones ... I don't think under UI there will be any difference. How user see it? ... I don't think there will be difference. Right?"; `evidence/team-tab-messages-2026-11-10.txt`
- Triggering finding IDs: N/A
- Prior authoritative requirements/design status: requirements `Ready for Approval`; no design
- Current authoritative requirements/design status: requirements `Approved`; no design
- Requirement, behavior, acceptance-criteria, scenario or decision IDs affected: BEH-005, REQ-004, AC-011, DEC-001
- Scenario-basis or scenario-validity changes: none
- Why this baseline or revision was recorded: the user's answer settles the one open decision. The Solution Designer's recommendation (A, show only messages with listed runs) is withdrawn: the user wants no visible change, and the check of how the tab is built showed that keeping every message needs no log of a dismissed run. The tab shows the focused agent's messages; a top run's own agent has all of them in its own log (2,097 for the manager, 1,957 of them with runs of closed Tasks). The 2,224 further messages that the listed runs' logs add to the composed view (2,141 inside one delegated team, 83 between two runs) are shown only when a member of a listed run is focused, and rows of closed runs are hidden today.
- Canonical requirements, investigation and design sections changed: `requirements-doc.md` status, BEH-005, REQ-004, AC-011, DEC-001, readiness; `investigation-notes.md` BEH-005 and the measurement
- Supplemental artifacts added, changed or removed: `evidence/measure_team_tab_messages.py`, `evidence/team-tab-messages-2026-11-10.txt`
- Product design evidence or product decisions incorporated: DEC-001 = B
- Intended behavior changed: `Yes` (the Team tab stays unchanged instead of pending)
- Approval impact, exact approved requirements baseline, who approved, and approval reference: approved at `SR-002`. DEC-001 by the user (the quote above); the rest by the Solution Designer within the Task's direction, the user informed in the same conversation
- Behavior-defining supplement versions and approval references: none
- Affected design/review basis invalidated or rebuilt: N/A (no design yet)
- Post-design task-size/risk classification and rationale changes: N/A
- Applied handoff-rule outcome / result-file reference, when a handoff occurred: none
- Downstream and architecture-review impact: none yet
- Remaining gaps, assumptions or blocked decisions: notes R-001, U-001, U-002; ASM-001; where the Team tab gets the name of a dismissed run's agent (design)
- Next action: architecture investigation and design

### SR-003 — Architecture investigation and design: unlink at closure and at load, no migration

- Phase and classification: Requirements (evidence-driven refinement within the direction) and Design, `Initial Design`
- Triggering user feedback, Product package, investigation evidence, or role/report/round: investigation notes "Architecture Investigation" (A-1 … A-8) and the three evidence files
- Triggering finding IDs: N/A
- Prior authoritative requirements/design status: requirements `Approved` at SR-002; no design
- Current authoritative requirements/design status: requirements `Approved` at SR-003; design `Ready`
- Requirement, behavior, acceptance-criteria, scenario or decision IDs affected: REQ-001, REQ-003, REQ-005, REQ-007, AC-001, AC-002, AC-009, AC-011, SCN-006, UC-006, DEC-003 (changed), DEC-005, DEC-006, DEC-007 (new), ASM-001 (confirmed)
- Scenario-basis or scenario-validity changes: SCN-006 is "a top run is loaded after the upgrade" instead of "first start"
- Why this baseline or revision was recorded: the investigation settled how entries are removed and what cannot be rebuilt. (1) No startup migration: the stored shape does not change, and a removal step at load is needed anyway for a Task closed while its top run was not loaded; that step also removes today's closed entries (DEC-005). The Task's text names a startup migration; the outcome it asks for is kept, the mechanism is the Solution Designer's. (2) An entry of a run on another node stays: the link is this node's only record of it (DEC-003, reversing the first decision). (3) Two small derived effects are decided and recorded (DEC-006, DEC-007). (4) R-001 was wrong as first written and is corrected in the notes.
- Canonical requirements, investigation and design sections changed: `requirements-doc.md` rows above; `investigation-notes.md` "Architecture Investigation"; `design-spec.md` created
- Supplemental artifacts added, changed or removed: `evidence/measure_unlink_cases.py`, `evidence/unlink-cases-2026-11-10.txt`
- Product design evidence or product decisions incorporated: none
- Intended behavior changed: `Yes`, within the Task's direction: when existing entries go (at the run's next load, not at startup); entries of runs on another node stay
- Approval impact, exact approved requirements baseline, who approved, and approval reference: approved at `SR-003` by the Solution Designer within the direction (no `Needs user` decision: no visible behavior, scope or product direction changes; the data change is the one the Task asks for and is rebuilt from the run's own file). The user is informed in the Solution Designer's conversation with the handoff.
- Behavior-defining supplement versions and approval references: none
- Affected design/review basis invalidated or rebuilt: first design
- Post-design task-size/risk classification and rationale changes: `Large`, `High` (design spec)
- Applied handoff-rule outcome / result-file reference, when a handoff occurred: see `handoff-architecture-design-complete.md`
- Downstream and architecture-review impact: first review
- Remaining gaps, assumptions or blocked decisions: notes U-003 … U-005; follow-up FU-001
- Next action: architecture review

### SR-004 — No stored list: the tree is built from the Task records

- Phase and classification: Requirements (user change of the model) and Design, `Design Rebuilt`
- Triggering user feedback, Product package, investigation evidence, or role/report/round: the user, 2026-11-10, after the SR-003 handoff: "the task information also contains that, right? And this collaboration tree itself can be built actually in memory from ... the tasks which are still in progress ... then we don't need to keep this on disk ... what's the point?"; then "I would take your recommendation. Let them leave the tree." and "I think it's clearer. Now it's cleaner. We don't have this duplicated information stored on disk." Investigation notes "The Task-Record Model" (B-1 … B-4); `evidence/links-without-task-2026-11-10.txt`. The Architecture Reviewer's observations of 2026-11-10 (a message; no report, no round).
- Triggering finding IDs: N/A
- Prior authoritative requirements/design status: requirements `Approved` at SR-003; design `Ready` at SR-003, in review
- Current authoritative requirements/design status: requirements `Approved` at SR-004; design `Ready` at SR-004
- Requirement, behavior, acceptance-criteria, scenario or decision IDs affected: REQ-001, REQ-003, REQ-007, AC-001, AC-005, AC-009, AC-010, QR-002; DEC-005 (reason changed), DEC-008, DEC-009 (the user), DEC-010 (new)
- Scenario-basis or scenario-validity changes: none
- Why this baseline or revision was recorded: the user replaced the model. SR-003 kept the stored list of delegated runs and trimmed it at closure and at load. The user asked why the list is stored at all when the Task record holds the same relationship, and decided it is not (DEC-009). The 14 runs that have no Task record leave the tree (DEC-008). The Solution Designer agrees with the model: it removes a redundant stored copy instead of maintaining it, and needs no step at closure, at load or for old data.
- Canonical requirements, investigation and design sections changed: `requirements-doc.md` rows above, approval and outcome lines; `investigation-notes.md` section "The Task-Record Model" and the unknowns list; `design-spec.md` rewritten (it now has a Design Decisions section; the reviewer noted SR-003 cited D-numbers without defining them)
- Supplemental artifacts added, changed or removed: `evidence/measure_links_without_task.py`, `evidence/links-without-task-2026-11-10.txt`
- Product design evidence or product decisions incorporated: DEC-008, DEC-009
- Intended behavior changed: `Yes`: no top run stores a list of local delegated runs; runs without a Task record are in no tree; a run whose Task record cannot be read is absent until it is readable
- Approval impact, exact approved requirements baseline, who approved, and approval reference: approved at `SR-004`. DEC-008 and DEC-009 by the user (quotes above); DEC-010 and the unchanged rest by the Solution Designer within that direction, the user informed
- Behavior-defining supplement versions and approval references: none
- Affected design/review basis invalidated or rebuilt: the SR-003 design is withdrawn; no review decision existed for it
- Post-design task-size/risk classification and rationale changes: still `Large`, `High`; the reasons changed (design spec)
- Applied handoff-rule outcome / result-file reference, when a handoff occurred: see `handoff-architecture-design-complete.md`
- Downstream and architecture-review impact: the first review round will be on SR-004
- Remaining gaps, assumptions or blocked decisions: notes U-003 … U-008; follow-ups FU-001 … FU-003; a note for `autobyteus-461` (design spec, "Relationship to autobyteus-461")
- Next action: architecture review
