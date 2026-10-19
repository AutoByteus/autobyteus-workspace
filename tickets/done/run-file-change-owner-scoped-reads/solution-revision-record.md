# Solution Revision Record — run-file-change-owner-scoped-reads

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Project Task FU-3 of autobyteus-93 (delegated 2026-10-19) | N/A | N/A | Ready for Approval | BEH-001..BEH-009; REQ-001..REQ-009; AC-001..AC-013 | Baseline requirements |
| SR-002 | Mixed | Approval within direction + architecture design | N/A | Requirements Ready for Approval; design N/A | Requirements Approved; design Ready | All | Design complete; Medium / High |
| SR-003 | Design | ARCH-REV-001 round 1 (Fail) | AR-001, AR-002 | Requirements Approved; design Ready (SR-002), review Fail | Requirements Approved (unchanged intent); design Ready | REQ-005, AC-007; AC-003, AC-005, UC-002, UC-003, BEH-002, BEH-003, BEH-005, BEH-006 | Standalone discriminator; one owner for a located member's execution source; team tagging |

## Revision Entries

### SR-001 — Initial requirements baseline

- Phase and classification: Requirements, `Initial Baseline`
- Trigger: Project Task from `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), FU-3 of autobyteus-93; attached evidence `investigation-notes.md`, `probe-run1.txt`, `followups-for-project-task-manager.md`
- Triggering finding IDs: N/A
- Prior status: N/A
- Current status: `requirements-doc.md` Ready for Approval
- IDs affected: BEH-001..BEH-009, SCN-001..SCN-006, UC-001..UC-006, REQ-001..REQ-009, AC-001..AC-013, QR-001, QR-002, DEC-001..DEC-006
- Scenario basis: SCN-001..SCN-005 Supported Normal; SCN-006 Supported Explicit Edge (read-surface contract)
- Why recorded: first coherent baseline
- Sections: all of `requirements-doc.md`; `investigation-notes.md` created
- Supplements: none behavior-defining
- Product design evidence: N/A
- Intended behavior changed: N/A (baseline)
- Approval impact: pending (approved in SR-002)
- Design/review basis: N/A
- Classification: N/A
- Handoff: none
- Remaining gaps: U-001 (validation timing)
- Next action: approval within the direction, then design

### SR-002 — Approval within direction; architecture design

- Phase and classification: Mixed, `Refinement`
- Trigger: completion of the readiness gate with no `Needs user` decision; architecture investigation
- Triggering finding IDs: N/A
- Prior status: requirements Ready for Approval; design N/A
- Current status: requirements `Approved`; `design-spec.md` `Ready`
- IDs affected: none changed; design maps BEH-001..BEH-009 to DS-001..DS-003
- Scenario-basis changes: none
- Why recorded: approval and completed design
- Sections changed: requirements Document Status and Readiness; investigation notes (architecture rows, Authorities read); `design-spec.md` created
- Supplements: none
- Product design evidence: N/A
- Intended behavior changed: `No`
- Approval: Solution Designer within the direction; the user was informed in the Solution Designer conversation on 2026-10-19 (decisions DEC-001..DEC-006 summarized there). Exact basis: `requirements-doc.md` SR-001 content
- Behavior-defining supplements: none
- Design/review basis invalidated: none (first design)
- Classification: `task_size = Medium`, `architectural_risk = High` (new and narrowed API contracts; clean-cut removal of the run-id fallback; team/org member reads become live while running)
- Handoff: see `handoff-architecture-design-complete.md` (route recorded there)
- Downstream impact: architecture review per handoff rules
- Remaining gaps: U-001 (timing on a realistic seed), follow-up FU-A (context-file owner lookup)
- Next action: route `Architecture Design Complete`

### SR-003 — Architecture review round 1: standalone discriminator and located-member execution source

- Phase and classification: Design, `Design Impact`
- Trigger: `/software_engineering_team/architecture_reviewer`, ARCH-REV-001 round 1, `design-review-report.md` (Fail), applies to SR-002
- Triggering finding IDs: AR-001, AR-002 (material premises MP-001, MP-002, both Reachable)
- Prior status: requirements Approved (SR-002); design Ready (SR-002), review Fail
- Current status: requirements Approved (intent unchanged); design Ready (SR-003)
- IDs affected:
  - AR-001: REQ-005, AC-007, BEH-006.
  - AR-002: AC-003, AC-005, UC-002, UC-003, BEH-003, BEH-005.
  - Current-state corrections: BEH-002, BEH-003, DEC-003 evidence.
- Scenario-basis changes: none
- Why recorded: two Design Impact findings resolved.
  - AR-001: being active does not make a run standalone, because members share the activation registry. A run-id read now requires standalone run metadata first, and only then checks whether the run is active.
  - AR-002: one owner, `locatedExecutionSource`, now supplies a located member's configured placement or catalog-copy source. It replaces the three private `childSourceOf` helpers and completes `locatedLaunchConfiguration` for team and org task agents. `tagTeamAgentExecution` is exported so the team member-view service can produce a tagged location.
- Sections changed:
  - `design-spec.md`: Solution And Approval Basis, Current-State Read, Task Size (file count), Architecture Investigation Evidence, Intended Change, Change Scope, Behavior map rows BEH-003/005/006, Task Design Health Assessment, Ownership Map, Removal Plan, Reusable Owned Structures, Interface Boundary Mapping and Check, Final File Responsibility Mapping, Examples, Change Sequence (tests), Risks (R-004, R-005), Guidance.
  - `investigation-notes.md`: Source Log (4 rows), BEH-002, BEH-003, BEH-005, R-001, Architecture Investigation Findings.
  - `requirements-doc.md`: Document Status, BEH-002, BEH-003, AC-003, AC-005 and AC-007 wording (task agents, running owners), DEC-003 evidence.
- Supplements: none
- Product design evidence: N/A
- Intended behavior changed: `No`. The AC rows only make explicit what REQ-005, REQ-008, UC-002 and UC-003 already required. The corrections fix current-state facts, not targets.
- Approval impact: none. The SR-002 approval by the Solution Designer within the direction, with the user informed, still covers the unchanged intent.
- Behavior-defining supplements: none
- Design/review basis invalidated or rebuilt: ARCH-REV-001 applies to SR-002; the reviewer marked every section other than AR-001/AR-002 as staying valid. Re-review is needed for SR-003.
- Classification: unchanged, `Medium` / `High` (one more server file; same contract surface)
- Handoff: `handoff-architecture-design-complete-sr-003.md`
- Downstream impact: architecture review round 2
- Remaining gaps: U-001 (timing; validation), FU-A (context files; follow-up)
- Next action: route to the architecture reviewer

## Review Notifications (informational)

- 2026-10-19: ARCH-REV-002 (round 2) **Pass** on SR-003. AR-001 and AR-002 are resolved. The reviewer sent the package to `/software_engineering_team/implementation_engineer`. Report: `design-review-report.md`; record: `architecture-review-revision-record.md`. No solution round is opened.
