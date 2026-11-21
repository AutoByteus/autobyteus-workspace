# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger | Finding IDs | Prior Status | Current Status | Affected IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-005 | Design | Architecture design | AF-01..AF-09 | Approved; design N/A | Approved; design Ready | REQ-001..REQ-009 (realized) | design-spec.md; Large / High |
| SR-004 | Requirements | The user's decisions 2026-11-21 | N/A | Ready for Approval | Approved | DEC-001..DEC-003, REQ-008, REQ-009 | Approved: convert existing Org runs, follow the Org definition, keep FU-003 in this ticket |
| SR-003 | Requirements | Container restructuring investigation | IF-09..IF-14 | Draft | Ready for Approval | REQ-001..REQ-009, AC-001..AC-008, DEC-001..DEC-005 | Requirements for the Org container; awaiting DEC-001..DEC-003 |
| SR-002 | Requirements | The user's direction 2026-11-21: Org as a container of independent runs | N/A | Ready for Approval | Draft | FU-002 approach (all REQ) | Direction set; investigation of the container restructuring before new requirements |
| SR-001 | Requirements | Initial baseline (Task autobyteus-29: FU-002, FU-003 of autobyteus-22) | IF-01..IF-08 | N/A | Ready for Approval | REQ-001..REQ-004, AC-001..AC-007, DEC-001..DEC-004 | Presented to the user; awaiting DEC-001 |

## Revision Entries

### SR-001 — Requirements baseline

- Trigger: Project Task autobyteus-29 from `/project_task_manager`; the user's "work on the follow-up immediately" (2026-11-21).
- Status: requirements `Ready for Approval`; design not created.
- Key evidence: Org-mounted Teams are fixed at Org start (IF-01..IF-05); a peer Team copy's members are recorded once on the delegating node and never refreshed (IF-06..IF-08).
- Approval impact: pending the user's DEC-001 (Org-definition following in or out).
- Next action: the user's answer, then architecture design.

### SR-002 — The user's direction: an Org is a container of independent runs

- Trigger: the user in the Solution Designer conversation, 2026-11-21, after the explanation that an Org run today is one run holding its teams as parts (one tree, one log), while `collaboration_model.md` CM-3 calls an Org "a container, not a Team" whose units are independent: "if we make the organization just a container and each team will basically existed in its independent now ... inside the organization that might be also individual agents we can also put the individual agent inside their own so it behaves like independence ... then the current like a dynamic feature we added will be applied to this organization as well right?" and then "Yes ... I also cling to the second option yeah go ahead let's go with the second option".
- Decision (user): FU-002 is solved by restructuring Org runs so each mounted Team is its own Team run and each direct agent its own agent run, with the Org run as their container (option B), not by adding following logic to the Org's own saved copy (option A, rejected).
- Status: requirements back to `Draft`; SR-001's REQ-001/REQ-002/DEC-001 are superseded by the restructuring requirements to come; REQ-003 (FU-003) stands.
- Next action: investigate the container restructuring (creation, execution, messaging, restore, history and UI, conversion of existing Org runs, size and risk), then present requirements and decisions to the user.

### SR-003 — Requirements for the Org container

- Trigger: investigation after the user's direction (SR-002): IF-09..IF-14 (Org run = one root today; CM-3 calls it a container; precedents for "parts become own runs" with sealed migrations; one user Org run).
- Requirements rewritten: REQ-001..REQ-009, AC-001..AC-008; SR-001's REQ-001/REQ-002/DEC-001 superseded; FU-003 kept as REQ-008 pending DEC-003.
- Needs user: DEC-001 (convert existing Org runs, recommended), DEC-002 (also follow the Org definition, recommended include), DEC-003 (split FU-003 into its own Task, recommended).
- Next action: the user's decisions and approval.

#### Note on SR-003 (no new revision)

- 2026-11-21: the user decided DEC-001 (a): existing Org runs are converted by a data migration, learning from the earlier refactorings (`task-agent-own-run-v1`, `delegated-runs-own-runs-v1`). DEC-002 and DEC-003 still open.

### SR-004 — Approval

- Trigger: the user, 2026-11-21: DEC-001 (a) (data migration of existing Org runs, learning from the earlier refactorings), then "I think you should contain both" in answer to "split FU-003 off or keep it?" and "also follow the Org definition?".
- Recorded: DEC-002 include (Org follows its Org definition), DEC-003 keep FU-003 in this ticket; the reading was stated to the user for correction.
- Status: requirements `Approved` (SR-004). Next action: architecture design, including the mandatory migration-conventions investigation.

### SR-005 — Architecture design

- Trigger: approved requirements (SR-004); migration-conventions check and architecture investigation AF-01..AF-09 on `9f6add773b`.
- Design: Org container (`AgentOrgContainer`), units as Team/agent runs with fixed `containedIn`, cross-run address resolution and delivery inside a container, Org rules merged into unit rules, Org view composed server-side (web contract unchanged), Org follow, sealed migration `20261122_agent_org_units_own_runs_v1` with follow-ups, FU-003 signed peer notice + reconcile; eight ordered slices.
- Requirements wording: AC-006 and Verification Intent corrected to the guideline's rule (hand-built fixtures of released shapes; never real data or a copy) — evidence-only.
- Classification: Large / High. Next action: architecture review.
