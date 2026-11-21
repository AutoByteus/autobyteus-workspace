# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger | Finding IDs | Prior Status | Current Status | Affected IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
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
