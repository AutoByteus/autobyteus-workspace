# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger | Finding IDs | Prior Status | Current Status | Affected IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial baseline (Task autobyteus-22) | IF-01..IF-15 | N/A | Ready for Approval | BEH-001..005, REQ-001..007, AC-001..008, DEC-001..009 | Recommendation presented to the user; awaiting DEC-001..DEC-004 |
| SR-002 | Requirements | The user's Task comment 2026-11-18 (UI; rules believed dynamic) | IF-16 | Ready for Approval | Ready for Approval | UC-005, REQ-008, AC-009, SCN-006; premise correction | UI added; dynamic-rules premise checked and corrected with evidence |
| SR-010 | Design | Architecture review ARCH-REV-003 Fail (Design Impact) | AR-007, AR-008, AR-009 | Approved; design Ready (SR-009 reviewed Fail) | Approved; design Ready (revised) | AC-003, AC-005, AC-009; DEC-002 (realization) | Leaving outside a live run; committer-owned release; one member source for both tree paths |
| SR-009 | Design | Failure-origin review CRR-002 (API-REV-001 Fail) | CR-002 (Design Impact), CR-001 (Local Fix routing choice), O-1, O-2 | Approved; design Ready (implemented, validation Fail) | Approved; design Ready (revised) | AC-003, AC-007, AC-009, AC-010; DEC-002 (realization) | Leaving shown on the rendered run-tree rows from a stored marker; routing invariant; planner warning; dead panel removed |
| SR-008 | Design | Architecture review ARCH-REV-001 Fail (Design Impact) | AR-001..AR-006, N-1..N-5 | Approved; design Ready (reviewed Fail) | Approved; design Ready (revised) | REQ-002, REQ-004, REQ-008, REQ-009, AC-003, AC-009, AC-010; DEC-002/003/006/007 (realization only) | Design revised; resubmitted |
| SR-007 | Design | Architecture design | AF-01..AF-18 | Approved; design N/A | Approved; design Ready | REQ-001..REQ-009 (realized) | design-spec.md; Large / High |
| SR-006 | Evidence | Skill update 2026-11-21 (feasibility of the proof) | AF-01..AF-18 | Approved | Approved | AC-001..AC-010 (verification intent) | Verification intent recorded; proof feasible, no evidence decision |
| SR-005 | Requirements | The user's approval, 2026-11-21 | N/A | Ready for Approval | Approved | DEC-001..DEC-003 | Requirements approved by the user |
| SR-004 | Mixed | The user 2026-11-18/21: rebase on latest personal and re-analyse; every remaining member is notified | IF-20 | Ready for Approval | Ready for Approval | DEC-004, REQ-006, REQ-009, AC-006, AC-010 | Base `a07767f4d0`; findings hold; DEC-004 decided by the user; refusal safety net added |
| SR-003 | Evidence | The user, 2026-11-18: base the worktree on the latest origin/personal and re-analyse | IF-17..IF-19 | Ready for Approval | Ready for Approval | REQ-008 (path), none changed | Worktree on `53b72018ad`; findings hold; UI path found |

## Revision Entries

### SR-001 — Investigation and recommendation

- Phase and classification: Requirements, `Initial Baseline`
- Trigger: Project Task autobyteus-22 (the user's questions, 2026-11-11)
- Prior status: N/A; current: requirements `Ready for Approval`
- Key evidence: membership, coordinator and handoff rules are frozen in the run's saved tree at start (IF-01..IF-04); measured on the live Marketing Team run (IF-05); the SemFlow team is a delegated Team copy (IF-06). Correction to the Task's facts: `get_handoff_rules` does not read current rules.
- Intended behavior changed: N/A (baseline)
- Approval impact: pending the user's DEC-001..DEC-004
- Next action: the user's decisions and approval, then architecture design

### SR-002 — UI scope and handoff-rule premise

- Trigger: the user's comment on the Task (2026-11-18), relayed by `/project_task_manager`: rules are already dynamic, so a running team should follow; include the UI (new member appears, removed disappears, user can talk to current members).
- Changes: UC-005, REQ-008, AC-009, SCN-006 added. Premise re-checked on `origin/personal` `b1229d0430` (IF-16): `get_handoff_rules` still returns the run's launch-time rules; recorded as a correction in the requirements' Problem section; REQ-003 already makes rules follow the definition.
- Intended behavior changed: Yes (UI added, within the user's direction)
- Approval impact: still `Ready for Approval`; the user's DEC-001..DEC-004 pending
- Next action: the user's decisions

### SR-003 — Rebased worktree and re-analysis

- Trigger: the user, 2026-11-18: "Base your worktree on the latest original branch and the re-analyse".
- Evidence-only: worktree recreated on `origin/personal` `53b72018ad` (the merge into the old worktree failed on a filesystem symlink quirk, see investigation meta). IF-17: root cause unchanged on the latest base. IF-18: the 461 run-tree view gives REQ-008 a server-owned path. IF-19: `list_running_agents` is another reader of a run's members.
- Intended behavior changed: No. Approval impact: none; DEC-001..DEC-004 still need the user.

### SR-004 — Second re-analysis; notice to every member

- Trigger: the user, 2026-11-21: base the worktree on the latest origin/personal and analyse again; then: members still on the team also receive the notice; agents are not stupid; the platform covers a rare mistake.
- Base: ticket commits rebased onto `a07767f4d0` (447 commits after `53b72018ad`). IF-20: all findings hold; no overlapping work on `personal`; an added member must get a model its runtime offers (`8e2d3b76c0`).
- DEC-004 decided by the user: notice to every remaining member (joined, left, current rules). REQ-009 / AC-010 added: a clear refusal for a message to a member that left.
- Intended behavior changed: Yes (by the user). Approval impact: DEC-001..DEC-003 still need the user.

### SR-005 — Approval

- Trigger: the user, 2026-11-21, in the Solution Designer conversation: "Anyway I think now you have the fourth picture also the requirement is also clear right now I think you can work on it now is it" — after the summary asking for a yes on recommendations 1–3, and after deciding DEC-004 himself.
- Status: requirements `Approved`; DEC-001 (a) apply at once to running runs and on reopen to stopped runs; DEC-002 (a) a busy removed member finishes its current turn, then stops; DEC-003 standalone Team runs and delegated Team copies (Org-mounted Teams = FU-002); DEC-004 notice to every remaining member (SR-004).
- Repair: the SR-004 edit had garbled the REQ-006 row (a match inside it instead of the DEC-004 row); REQ-006 and DEC-004 restored to their intended text before this approval.
- Approved baseline: requirements at SR-005. Next action: architecture design.

### SR-006 — Verification intent and architecture findings

- Trigger: the solution-designer skill update of 2026-11-21 ("feasibility of the proof"); architecture investigation on `a07767f4d0` (investigation AF-01..AF-18; FU-003 added).
- Evidence-only: the requirements' Verification Intent names the isolated instance, test package, real runtimes via the test vault, restart, rendered app probe and invalid-definition check. All feasible without credentials beyond the test vault: no evidence decision.
- Intended behavior changed: No. Approval: unchanged (User, SR-005).

### SR-007 — Architecture design

- Trigger: approved requirements (SR-005/SR-006); architecture investigation AF-01..AF-18 on `a07767f4d0`.
- Design: `design-spec.md` — one live execution view `TeamRunMembership`; pure planner; committer in `RootTeamRun` (locked write, then swap); restore follows stored tree; listener on the definition announcement; former members in the tree (`formerMembers`, no migration); live `get_handoff_rules`; refusal and notice texts (normative, § Exact Texts); window via `DelegationIndex.runPartsChanged`.
- Vocabulary: the requirements' "retire/retired" is the action; the stored and documented word for the result is "former member" (GLOSSARY entry in this change).
- Classification: task_size Large, architectural_risk High.
- Next action: independent architecture review.

### SR-008 — Design revision after ARCH-REV-001

- Trigger: `/architecture_reviewer` ARCH-REV-001 (`design-review-report.md`), Fail, `Design Impact`, AR-001..AR-006 and notes N-1..N-5; core approach kept.
- AR-001: one member-state rule (current / leaving / former) applied at every call site, with file:line; engine sender/receiver split (`maySend`); leaving members stay listed with a "Leaving" tag until stopped (visibility decision within REQ-008/DEC-002).
- AR-002: scope keyed on `copiedFrom`, recorded once at copy creation and never edited; old copies = `team_definition` (AF-13).
- AR-003: handles keyed by agent run ID; a rejoin while leaving cancels the leave.
- AR-004: open Team view re-opens its live snapshot (in-band `TEAM_EXECUTION_VIEW_SNAPSHOT`, no new frame type) on a `team_membership_changed` view event; member DTO `leaving?`; contracts, server streaming and web files in scope; run-tree rows keep `DelegationIndex.runPartsChanged`.
- AR-005: former-member refusal in both address-resolution steps and for `send_message_to` by run ID.
- AR-006: `TeamRunMembership` is the sole creator of member contexts (retained ones kept by run ID); `applyMembership` only retires handles.
- N-1 follow right after restore registration; N-2 net-merge of notices; N-3 rules to an unlaunchable member left out; N-4 per-root containment; N-5 size limits kept.
- Intended behavior changed: No (realization of approved DEC/REQ; the "Leaving" tag is a presentation detail within REQ-008). Classification unchanged: Large / High.
- Next action: architecture re-review.

#### Review note on SR-008 (no new revision)

- 2026-11-21: architecture review `ARCH-REV-002` — Pass on SR-008, AR-001..AR-006 resolved, Large / High confirmed; the reviewer routed the package to implementation. Informational for the Solution Designer.
- Factual correction recorded from the review's N-7: IF-06's "addresses prefixed `/supervised_research_team/…`" no longer matches current copy trees (461 changed copies to the team's own addresses), so D-SCOPE's mount-path formula yields `/`; the design is unaffected (compilation `delegated_team` at `/`).

### SR-009 — Where a leaving member is shown; routing by run ID

- Trigger: `/code_reviewer` CRR-002 (failure-origin review of API/E2E API-REV-001): CR-002 Design Impact (F-2): the design's "Leaving" tag was placed in `TeamMembersPanel.vue`, which nothing mounts; the rendered member list is the run-tree `team_member` rows from the run's file, which drop a leaving member at once. CR-001 Local Fix (F-1): run-ID refusal never reached because the router routes only current members to the sender's root. Observations O-1 (unparsable definition: loader keeps last good, planner logs nothing) and O-2 (unknown agent: whole run unchanged).
- Decisions (realization of approved DEC-002/REQ-008/REQ-009/REQ-007; no behavior change):
  - Leaving is a stored fact: `formerMembers[i].leaving: true`, set by the committing write, cleared by a release write and at restore. The run-tree `team_member` rows show it ("Leaving" tag, still openable to answer approvals); the view snapshot's contexts read the same marker. N-8 superseded.
  - `TeamMembersPanel.vue` (dead on base, touched) is removed (Principle 7).
  - Routing: the router uses a new root method `ownsAgentRun` (current, leaving, former); `hasAgentExecution` unchanged so restart-resume `placeOf` is unaffected.
  - O-1: the planner logs `TEAM_RUN_DEFINITION_NOT_FOLLOWED` naming the load issue and does not plan against the kept last good definition; O-2 agreed (whole-definition invalid → unchanged + warning).
- Intended behavior changed: No. Classification unchanged: Large / High.
- Route: revised design → architecture re-review (handoff rule for a revised Large/High package); CR-001 stays an implementation Local Fix for the same round.

### SR-010 — Leaving outside a live run; release ownership; one member source

- Trigger: `/architecture_reviewer` ARCH-REV-003 (Fail, Design Impact) on SR-009: AR-007, AR-008, AR-009; note on O-1's warn-once set.
- AR-007: a `leaving` marker shows as a leaving row only while the Team run is live; outside a live run it reads as former (no row), decided in one function `teamMemberRowsOf(ownTeam, isLive)`; the manager's unregister of a root with markers calls `runPartsChanged`; restore clears stale markers.
- AR-008: marker = "removed with a live execution, not yet stopped", set by the locked plan from live execution IDs; the execution manager only stops handles and reports `released`; the committer owns the release step (locked write → replaceTree + membership.replace → removeStoppedHandle → runPartsChanged → view event); `TeamRunMembership.release` removed; a definitely failed release write is healed by the next plan; an indeterminate one fail-stops the root (existing rule).
- AR-009: delegated Team copy member rows under the delegating run read the child's `ownTreeOf` through the same `teamMemberRowsOf`; `DelegationIndex.agentsOf` unchanged for messages and history.
- O-1 note: the warn-once set clears when the definition becomes valid.
- Intended behavior changed: No. Classification unchanged: Large / High. Route: architecture re-review; CR-001 stays an implementation Local Fix.

#### Review note on SR-010 (no new revision)

- 2026-11-21: architecture review `ARCH-REV-004` — Pass on SR-010, AR-007..AR-009 resolved, Large / High confirmed; the reviewer routed the package to implementation with CR-001 as a Local Fix in the same round. Informational for the Solution Designer.
