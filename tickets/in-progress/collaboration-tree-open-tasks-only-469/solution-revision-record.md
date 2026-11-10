# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial coherent baseline (Task `autobyteus-469`) | N/A | N/A | Ready for Approval | BEH-001 … BEH-007, REQ-001 … REQ-008 | Presented to the user; DEC-001 needs him |
| SR-002 | Requirements | The user's answer to DEC-001 | N/A | Ready for Approval | Approved | BEH-005, REQ-004, AC-011, DEC-001 | Approved; architecture investigation starts |
| SR-003 | Requirements and design | Architecture investigation | N/A | Requirements Approved; no design | Requirements Approved; design Ready | REQ-001, REQ-003, REQ-005, REQ-007, AC-001, AC-002, AC-009, AC-011, DEC-003, DEC-005 … DEC-007 | Sent to architecture review; withdrawn before a decision (see SR-004) |
| SR-004 | Requirements and design | The user's decisions DEC-009 and DEC-008 after the SR-003 handoff | N/A (the review of SR-003 was stopped without a report) | Requirements Approved at SR-003; design Ready (SR-003) | Requirements Approved; design Ready (SR-004) | REQ-001, REQ-003, REQ-007, AC-001, AC-005, AC-009, AC-010, QR-002, DEC-005, DEC-008 … DEC-010 | Design rebuilt; Large, High; architecture review ARCH-REV-001: Fail with one finding (AR-001) |
| SR-005 | Design (and wording of four requirement rows) | Architecture review ARCH-REV-001, round 1, `design-review-report.md` | AR-001 | Requirements Approved at SR-004; design Ready, review Fail | Requirements Approved; design Ready (SR-005) | BEH-003, BEH-007; REQ-001, REQ-003, AC-001, AC-005, AC-008 (wording) | Design revised; architecture review ARCH-REV-002 (round 2): Pass, no new findings; the reviewer handed off to the Implementation Engineer |
| SR-006 | Design | Implementation Engineer, Design Impact from early check U-008 (message of 2026-11-10) | N/A (no report ID; the engineer's message) | Requirements Approved; design Ready (SR-005), review Pass (ARCH-REV-002) | Requirements Approved; design Ready (SR-006) | BEH-002 (the rule that realizes REQ-001) | D-1's candidate rule corrected; architecture review ARCH-REV-003 (round 3): Pass, no findings |
| SR-007 | Design (and wording of REQ-007, AC-009) | Implementation Engineer, second Design Impact (message of 2026-11-10) | N/A | Requirements Approved; design Ready (SR-006), review Pass (ARCH-REV-003) | Requirements Approved; design Ready (SR-007) | REQ-007, AC-009; BEH-002 | D-3 corrected; architecture review ARCH-REV-004 (round 4): Fail with one finding (AR-002) |
| SR-008 | Design (and wording of REQ-007, AC-009) | Architecture review ARCH-REV-004, round 4, `design-review-report.md` | AR-002 | Requirements Approved; design Ready (SR-007), review Fail | Requirements Approved; design Ready (SR-008) | REQ-007, AC-009; BEH-002 | D-3 corrected; back to architecture review |

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

### SR-005 — Startup admission reads a run's own parts only (answer to AR-001)

- Phase and classification: Design, `Design Impact` resolved; requirement wording corrections that change no intended behavior
- Triggering user feedback, Product package, investigation evidence, or role/report/round: Architecture Reviewer, `design-review-report.md` and `architecture-review-revision-record.md`, ARCH-REV-001, round 1, decision `Fail`
- Triggering finding IDs: AR-001 (High, Design Impact)
- Prior authoritative requirements/design status: requirements `Approved` at SR-004; design `Ready` at SR-004, reviewed `Fail`
- Current authoritative requirements/design status: requirements `Approved` (SR-004 baseline, wording corrected at SR-005); design `Ready` at SR-005
- Requirement, behavior, acceptance-criteria, scenario or decision IDs affected: BEH-003, BEH-007 (design paths); wording of REQ-001, REQ-003, AC-001, AC-005, AC-008
- Scenario-basis or scenario-validity changes: none
- Why this baseline or revision was recorded: AR-001 is correct. The startup package admission scan reads every Team and Org tree before the Task records are loaded, in both entry points, and a maintenance script reads them in a process that never loads the Task records. SR-004 would have refused every Team and Org run after an ordinary start. Of the reviewer's two routes the design takes the first: admission and the maintenance repair read the run's own parts only (new D-11, `readOwnParts`). Reasons: admission judges a root run's own package, and the validator already declares "Structure only"; it removes a dependency instead of ordering one, so neither entry point's startup sequence changes; startup then reads less than today; and the second route could not serve the maintenance script. D-12 states the listing rule for a link to a run on another node whose delegator is an agent of a closed local run (no such link exists today).
- Canonical requirements, investigation and design sections changed: `design-spec.md`: Current-State Read, Design Decisions (D-11, D-12), classification text, evidence table, Change Scope consumers, Guideline checklist items 2 and 9, spine inventory and narratives (DS-001 scoped to after startup; new DS-008), interface and file mappings (the two stores' `readOwnParts`, the validator, the maintenance repair), Change Sequence, Key Tradeoffs, Risks, Guidance. `investigation-notes.md`: B-5 (the startup order of both entry points and all 19 construction sites, each placed before or after the binding), U-004 and U-007 closed, U-009 added. `requirements-doc.md`: REQ-001 (the first save after the upgrade), REQ-003 (the listing rule of a link to another node), AC-001, AC-005 (the warning names the Task, as DEC-010 says), AC-008 (also after a server restart).
- Supplemental artifacts added, changed or removed: none
- Product design evidence or product decisions incorporated: none
- Intended behavior changed: `No`
- Approval impact, exact approved requirements baseline, who approved, and approval reference: none; the SR-004 approval stands
- Behavior-defining supplement versions and approval references: none
- Affected design/review basis invalidated or rebuilt: the parts named above; everything else in SR-004 passed review and is unchanged
- Post-design task-size/risk classification and rationale changes: `Large`, `High`, unchanged
- Applied handoff-rule outcome / result-file reference, when a handoff occurred: see `handoff-architecture-design-complete.md`
- Downstream and architecture-review impact: review round 2
- Remaining gaps, assumptions or blocked decisions: notes U-003, U-005, U-006, U-008, U-009; follow-ups FU-001 … FU-003
- Next action: architecture review, round 2
- Review result (recorded 2026-11-10, informational): `Pass`, ARCH-REV-002, round 2, on SR-005 (`design-review-report.md`, `architecture-review-revision-record.md`, both the reviewer's). AR-001 resolved by D-11 and DS-008; D-12 matches today's rule (`remote-task-execution-links.ts:60-63`); the reviewer read both history row projectors and found they use own parts only (U-009). The reviewer delivered the implementation handoff to `/software_engineering_team/implementation_engineer`; the Solution Designer sends none.

### SR-006 — An open entry puts a run in the tree, whatever its start state

- Phase and classification: Design, `Design Impact` resolved
- Triggering user feedback, Product package, investigation evidence, or role/report/round: the Implementation Engineer's message of 2026-11-10 (early check U-008, which the design named as an escalation trigger); verified by the Solution Designer at the base revision (notes B-6)
- Triggering finding IDs: N/A (the engineer's message carries no finding ID)
- Prior authoritative requirements/design status: requirements `Approved`; design `Ready` at SR-005, architecture review `Pass` (ARCH-REV-002)
- Current authoritative requirements/design status: requirements `Approved` (unchanged); design `Ready` at SR-006
- Requirement, behavior, acceptance-criteria, scenario or decision IDs affected: BEH-002; the design rule that realizes REQ-001. No requirement text changes: REQ-001 already says "while the run has an open Task entry"
- Scenario-basis or scenario-validity changes: none
- Why this baseline or revision was recorded: SR-005's rule left out an entry whose `start` is `starting`. The engineer showed, and the code confirms, that every entry is `starting` from the moment a delegation is recorded until its work is delivered, also for a follow-up Task given to a run already in the tree, and after a crash between the activation commit and `markStarted`. The rule would have dropped runs that REQ-001 keeps in the tree. The Solution Designer's exclusion rested on an assumption about `starting` that was left as U-008 instead of being read. Corrected rule: the run's current entry names this top run and is open, whatever its `start`; a missing own file is silent for `starting` and `failed` and a warning for `started`.
- Canonical requirements, investigation and design sections changed: `design-spec.md` D-1, the evidence table, the interface row of `openDelegatedRunsOf`, the view rule's signature (`isMessageOfView(message, ownAgentRunIds, treeAgentRunIds)`, the engineer's equivalent form for a loaded root), the three attachment readers removed from the file mapping (they have no tree rule), Change Scope consumers, Change Sequence, Risks, Guidance; `investigation-notes.md` B-6
- Supplemental artifacts added, changed or removed: none
- Product design evidence or product decisions incorporated: none
- Intended behavior changed: `No`
- Approval impact, exact approved requirements baseline, who approved, and approval reference: none
- Behavior-defining supplement versions and approval references: none
- Affected design/review basis invalidated or rebuilt: D-1's rule only; ARCH-REV-002's pass covered the old rule (its residual note judged "start ≠ starting" sound on the premise U-008 was to check)
- Post-design task-size/risk classification and rationale changes: `Large`, `High`, unchanged
- Applied handoff-rule outcome / result-file reference, when a handoff occurred: the rule for a revised package with Large or High applies: sent to `/software_engineering_team/architecture_reviewer`; the Implementation Engineer was answered directly (it asked) and continues with the corrected rule, which it already implements
- Downstream and architecture-review impact: a narrow re-review of D-1's rule
- Remaining gaps, assumptions or blocked decisions: U-005 (in progress); follow-ups FU-001 … FU-003
- Next action: architecture review of the corrected rule; implementation continues on the parts the rule does not touch
- Review result (recorded 2026-11-10, informational): `Pass`, ARCH-REV-003, round 3, on SR-006 (`design-review-report.md`, `architecture-review-revision-record.md`, both the reviewer's). The corrected rule is verified in the code; the reviewer withdrew its round-2 note that called the old rule sound; the view-rule form and the removal of the attachment readers from the mapping are confirmed. The reviewer delivered the handoff to `/software_engineering_team/implementation_engineer`; the Solution Designer sends none.

### SR-007 — A save keeps a stored local entry whose run has no own file

- Phase and classification: Design, `Design Impact` resolved; requirement wording made precise
- Triggering user feedback, Product package, investigation evidence, or role/report/round: the Implementation Engineer's second message of 2026-11-10 (an existing migration test failed under D-3); the Solution Designer read the second released migration (notes B-7)
- Triggering finding IDs: N/A
- Prior authoritative requirements/design status: requirements `Approved`; design `Ready` at SR-006, architecture review `Pass` (ARCH-REV-003)
- Current authoritative requirements/design status: requirements `Approved` (SR-004 baseline; REQ-007 and AC-009 made precise at SR-007); design `Ready` at SR-007
- Requirement, behavior, acceptance-criteria, scenario or decision IDs affected: REQ-007, AC-009; BEH-002
- Scenario-basis or scenario-validity changes: none
- Why this baseline or revision was recorded: D-3 dropped every stored local entry at the first save, on the premise that each entry's facts are in the run's own file. That holds for links and not for a full record that an interrupted run of the released migration `20261017_task_agent_own_run_v1` has not yet moved; the app keeps running in that state, and a save would have destroyed the only copy. The Solution Designer's shape inventory covered the user's data, where the migration had finished, and not the supported partial state of that migration. Corrected rule, as the engineer implemented it: a stored local entry is left out at a save once its run's own file exists; otherwise it is kept unchanged and in place. The entry is not interpreted, so current code still holds no reader of old shapes.
- Canonical requirements, investigation and design sections changed: `design-spec.md` D-3, Persisted Data (reader/writer behavior, checklist item 4), Removal Plan, Backward-Compatibility Rejection Log, the bounded spine of the persistence coordinator, `knowsRunId`'s callers, the file mapping (each root's `hasAgentExecution` and `existing-copy-target.ts` instead of the three delivery files), Change Sequence step 4, Guidance; `requirements-doc.md` REQ-007, AC-009; `investigation-notes.md` B-7
- Supplemental artifacts added, changed or removed: none
- Product design evidence or product decisions incorporated: none
- Intended behavior changed: `No` for the user. For stored data: an entry whose run has no own file now stays in the file (REQ-007 said every local entry is left out at the next save)
- Approval impact, exact approved requirements baseline, who approved, and approval reference: approved by the Solution Designer within the direction (it preserves data the earlier wording would have destroyed; nothing visible changes); the user is informed
- Behavior-defining supplement versions and approval references: none
- Affected design/review basis invalidated or rebuilt: D-3 and its consequences listed above; ARCH-REV-002 and ARCH-REV-003 passed D-3 in its earlier form
- Post-design task-size/risk classification and rationale changes: `Large`, `High`, unchanged
- Applied handoff-rule outcome / result-file reference, when a handoff occurred: the rule for a revised package with Large or High applies: sent to `/software_engineering_team/architecture_reviewer`; the Implementation Engineer was answered directly and continues
- Downstream and architecture-review impact: a narrow re-review of D-3
- Remaining gaps, assumptions or blocked decisions: U-005 (three findings recorded in B-7, none a Design Impact; the engineer continues); follow-ups FU-001 … FU-003
- Next action: architecture review of D-3 as corrected

### SR-008 — A save leaves out only a link whose run owns its file (answer to AR-002)

- Phase and classification: Design, `Design Impact` resolved; requirement wording made precise
- Triggering user feedback, Product package, investigation evidence, or role/report/round: Architecture Reviewer, `design-review-report.md` and `architecture-review-revision-record.md`, ARCH-REV-004, round 4, decision `Fail`
- Triggering finding IDs: AR-002 (High, Design Impact)
- Prior authoritative requirements/design status: requirements `Approved`; design `Ready` at SR-007, reviewed `Fail`
- Current authoritative requirements/design status: requirements `Approved` (REQ-007 and AC-009 made precise); design `Ready` at SR-008
- Requirement, behavior, acceptance-criteria, scenario or decision IDs affected: REQ-007, AC-009; BEH-002
- Scenario-basis or scenario-validity changes: none
- Why this baseline or revision was recorded: AR-002 is correct. SR-007 left out a stored entry once its own run had its file. A full Team record of the released migration's unfinished state can have its own file and still hold the only record of a nested run. The condition is now positive and narrow: the entry is a link by an exact key set, and its run's own file exists at the standard place. Everything else stored is kept unchanged and not looked into. Of the review's two routes this is (b), with an exact key set instead of today's two-absent-keys test; route (a) is rejected because it makes current code walk a released shape's nesting (notes B-8). This is the third correction of D-3's save rule (SR-004 dropped everything, SR-007 looked at the own run only). The cause each time was the same: the rule was phrased as what may be dropped by exclusion, with the shape inventory taken from the user's finished data. The rule now names the one thing it may drop and keeps the rest.
- Canonical requirements, investigation and design sections changed: `design-spec.md` D-3, Legacy Removal Policy, Persisted Data (reader/writer behavior, checklist item 4), Removal Plan (two rows), Backward-Compatibility Rejection Log (two rows), the file mapping row of `task-agent-own-records.ts`, Guidance; `requirements-doc.md` REQ-007, AC-009 (three fixtures, the reviewer's among them); `investigation-notes.md` B-8
- Supplemental artifacts added, changed or removed: none
- Product design evidence or product decisions incorporated: none
- Intended behavior changed: `No` for the user. For stored data: a full record is never left out by a save
- Approval impact, exact approved requirements baseline, who approved, and approval reference: approved by the Solution Designer within the direction (data preservation; nothing visible changes); the user is informed
- Behavior-defining supplement versions and approval references: none
- Affected design/review basis invalidated or rebuilt: D-3 and the sections above; D-1 (round 3) and D-11 (round 2) stand
- Post-design task-size/risk classification and rationale changes: `Large`, `High`, unchanged
- Applied handoff-rule outcome / result-file reference, when a handoff occurred: sent to `/software_engineering_team/architecture_reviewer`; the Implementation Engineer, which implements D-3, was told directly
- Downstream and architecture-review impact: review round 5 on D-3
- Remaining gaps, assumptions or blocked decisions: U-005 (continues); follow-ups FU-001 … FU-003
- Next action: architecture review, round 5
