# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial coherent baseline (Project Task 9942a43c) | N/A | N/A | Approved (user, 2026-10-17) | BEH-001..004; REQ-001..004; AC-001..004; DEC-001..004 | DEC-001 (a) preserved, not shown — the user |
| SR-002 | Requirements | The user's revision, 2026-10-17 | N/A | Approved (SR-001) | Approved (user, 2026-10-17) | BEH-002, UC-002, REQ-003, AC-002, SCN-002, QR-001, DEC-001, Data Continuity | No migration; the retired shape is declared unsupported |
| SR-003 | Requirements | Evidence + the user's choice, 2026-10-17 | N/A | Approved (SR-002) | Approved (user, 2026-10-17) | BEH-002, UC-002, REQ-003, AC-002, SCN-002, DEC-001 | DEC-001 (e): no migration + cross-run standalone lookups skip unreadable trees with a warning |
| SR-004 | Mixed | Architecture investigation + design, 2026-10-17 | N/A | Approved (SR-003) | Requirements Approved; design Ready | REQ-002 (wording), DEC-006; design: reps. 1–4 removal, DS-002 containment | Large / High → architecture review |
| SR-005 | Mixed | ARCH-REV-001 (Fail), 2026-10-17 | ARCH-F-001, ARCH-F-002 | SR-004 | Requirements Approved (REQ-006 within the direction); design Ready | REQ-006, AC-006, DEC-007; stale lines reconciled; design Persisted Data / Released migrations, Removal plan | Re-review |
| SR-006 | Evidence | The user's evidence, 2026-10-17 | ARCH-F-001 (premise) | SR-005 | Requirements Approved; design Ready | REQ-006 / AC-006 withdrawn; DEC-008; AC-002, SCN-002 simplified | Re-review (reviewer informed) |

## Revision Entries

### SR-001 — Remove the nested task-team leftover: requirements baseline

- Phase and classification: `Initial Baseline`
- Triggering user feedback: the user, 2026-10-17 (8641c0ac conversation): clean up first, then resume 8641c0ac;
  Project Task from `/project_task_manager`.
- Triggering finding IDs: N/A (origin: 8641c0ac ARCH-F-002, premise corrected)
- Prior authoritative requirements/design status: N/A
- Current authoritative requirements/design status: requirements `Ready for Approval`; design not started.
- Affected IDs: BEH-001..004, UC-001..003, REQ-001..004, AC-001..004, SCN-001..004, DEC-001..004.
- Scenario-basis: SCN-002 a released old shape (v1.4.53–v1.4.69); SCN-004 rejected premise (team inside a team).
- Why recorded: first baseline presented to the user.
- Canonical sections changed: all (new).
- Supplemental artifacts: the Task brief (direction).
- Product design evidence: N/A.
- Intended behavior changed: N/A (baseline).
- Approval impact: pending; DEC-001 needs the user; DEC-002..004 decided by the Solution Designer within the direction.
- Behavior-defining supplement versions: None.
- Affected design/review basis: N/A.
- Post-design classification: N/A.
- Applied handoff-rule outcome: N/A.
- Downstream and architecture-review impact: N/A.
- Remaining gaps: DEC-001; U-001, U-002 for architecture.
- Next action: architecture design.
- Approval (2026-10-17): the user approved DEC-001 (a) "For all the records preserved, not shown … leave the data there … don't show it at all"; requirements `Approved` at SR-001.

### SR-002 — No migration: the old nested shape is declared unsupported

- Phase and classification: `Refinement` (user change to intended behavior)
- Trigger: the user, 2026-10-17: "is there even a need to migrate them? … what's the value … if the source code doesn't
  even read them anymore". Investigation: an unparseable tree is excluded by the existing startup check
  (`root-run-package-current-validator.ts`, `ROOT_RUN_PACKAGE_CURRENT_VALIDATION_FAILED`), so the app starts; the
  migration would only protect the rest of an affected run. Caveat given: the whole affected run is hidden.
- Prior status: Approved (SR-001, DEC-001 a). Current: Approved (SR-002, DEC-001 d).
- Affected IDs: BEH-002, UC-002, REQ-003, AC-002, SCN-002, QR-001, DEC-001, Data Continuity, Architecture Phase Input.
- Intended behavior changed: `Yes` — no migration, no preserved file; affected runs excluded; release-note declaration.
- Approval: the user, 2026-10-17: "I think no migration declared unsupported. Yeah, I agree with you … only consider it
  in the future if we want to do some data cleaning."
- Downstream impact: 8641c0ac gains no predecessor; its unreadable-tree rule covers such trees.
- Next action: architecture design.

### SR-003 — No migration, plus cross-run standalone lookups skip unreadable trees

- Phase and classification: `Refinement` (evidence correcting SR-002, user choice)
- Evidence: standalone runs' startup check reads metadata only; `StandaloneRootLocationService.findAgent/listAgents`
  without a root id read every standalone tree and throw on one unreadable tree; callers include
  `collaboration-execution-location-service.ts:46,68`, `team-member-run-view-projection-service.ts:79`,
  `run-file-change-projection-service.ts:108`. Team / org lookups scan admitted roots only.
- Options given: (e) one generic skip-and-warn rule vs (a) the small migration (would also need to move the old team's
  messages and repoint a released migration). The user: "If it's big, let's forget it … use your recommended version";
  then confirmed "they just log it … as a warning".
- Intended behavior changed: `Yes` — affected standalone runs stay listed but do not open; cross-run lookups skip
  unreadable trees with a warning.
- Next action: architecture design.
- Same round (2026-10-17): the user asked to make the containment principle general → REQ-005, AC-005, UC-004;
  `DESIGN.md` Mandatory Design Rule 7 "Contain bad data to its own run" written in the worktree (the user: "edit, please edit").

### SR-004 — Design: remove four team-inside-a-team representations; cross-run containment

- Phase and classification: `Mixed` (evidence + design; requirement wording refined within the direction)
- Evidence: architecture investigation found two more dead representations of the same concept — the
  `configured_team` DTO variant (no server producer; web renders it) and the team-definition member tree team node
  (builder emits agents only) — and that launch-configuration team scopes serve organizations (excluded, follow-up).
- Requirements: REQ-002 wording widened to all team-member representations; DEC-006 (Solution Designer, within the
  user's direction "we don't support sub-agent team anymore … refactor and clean up"; user informed). Intended
  behavior otherwise unchanged.
- Design: `design-spec.md` (Ready). Classification `Large` / `High` (two shared contracts and the persisted-tree parser
  narrowed; containment added at a cross-run boundary).
- Follow-ups: launch-configuration team scopes classification (Change Scope 1); data health notice
  `project_task_5d0b1bc2-b159-4557-b3e9-6a5f0f4b5d43` (recorded by the Project Task Manager).
- Next action: architecture review.

### SR-005 — Architecture review ARCH-REV-001 recovery

- Trigger: ARCH-REV-001 Fail — ARCH-F-001 (Design Impact): `20260905_agent_org_history_first_message_summary_v1`
  aborts for all Orgs on any Org diagnostic; ARCH-F-002 (Requirement Gap): stale pre-(e) lines.
- Verification: ARCH-F-001 confirmed in code (lines 84-88) and reachable (flat-families copies team `taskExecutions`
  into converted Orgs, `agent-org-runtime-tree-target.ts:11`). Other released migrations checked: locator migration
  and collaborators-v1 already contain per package / tree; snapshot and index migrations go through admitted roots or
  DS-002.
- Decision (Solution Designer, within the direction, DESIGN.md rule 7): DEC-007 (b) — per-Org `PRESERVED_INVALID_PACKAGE`
  warning in that migration, following two existing precedents; REQ-006, AC-006. Stale lines reconciled.
- Intended behavior changed: refinement only (containment per run, no data change). User informed.
- Next action: architecture re-review.
- Follow-up recorded by the Project Task Manager: data health notice `project_task_5d0b1bc2-b159-4557-b3e9-6a5f0f4b5d43`.

### SR-006 — The retired shape exists nowhere

- Trigger: the user, 2026-10-17: "Nobody has ever used the nested team. I can guarantee you … in our agent package we
  already completely removed the nested agent team."
- Effect: ARCH-F-001's mechanism is real but its scenario is not (no install holds the retired shape) → Technically
  Possible but Unsupported. REQ-006 / AC-006 withdrawn (DEC-007 moot, DEC-008); released migrations unchanged;
  retired-shape fixtures dropped. Kept: the cleanup, the release-note line, the generic skip-and-warn rule (rule 7)
  with a test using any unreadable standalone tree (AC-002 simplified).
- Intended behavior changed: No (scope reduced; no visible change).
- Next action: architecture re-review with SR-006 (reviewer informed while reviewing SR-005).
- Review: ARCH-REV-002 Pass of SR-005 (2026-10-17, `design-review-report.md`); the reviewer handed off to
  `/software_engineering_team/implementation_engineer`. SR-006 (a pure scope reduction) was sent to the implementation
  engineer and, for information, to the reviewer the same day.
