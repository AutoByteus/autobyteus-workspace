# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial coherent baseline (Task autobyteus-433 and its 2026-11-08 comment) | N/A | N/A | Approved | BEH-001…BEH-008; REQ-001…REQ-008; AC-001…AC-010 | Requirements approved within the direction; user informed |
| SR-002 | Design | Architecture design on the approved SR-001 | N/A | Requirements Approved; design N/A | Design Ready; `Medium` / `Low` | All (design) | `design-spec.md` complete; classified |

## Revision Entries

### SR-001 — Name, never address, on every phone surface

- Phase and classification: Requirements, `Initial Baseline`
- Triggering input: Project Task `autobyteus-433` (description and the user's comment of 2026-11-08), two phone screenshots (private; real names kept out of the repository)
- Triggering finding IDs: N/A
- Prior status: N/A
- Current status: `requirements-doc.md` Approved
- IDs affected: BEH-001…BEH-008, SCN-001…SCN-006, UC-001…UC-005, REQ-001…REQ-008, AC-001…AC-010, DEC-001…DEC-008
- Scenario-basis changes: none (baseline). Before approval was used downstream, a mixed APK/page-version scenario and its AC/quality row were removed as contrary to `DESIGN.md` rule 9 (one release, no mixed-version design); SCN-003 now covers the browser case only.
- Why recorded: first coherent baseline
- Canonical sections: all of `requirements-doc.md`; `investigation-notes.md`
- Supplements: none
- Product design evidence: none (the user gave the wording direction in the Task comment)
- Intended behavior changed: N/A (baseline)
- Approval: Solution Designer within the direction (no `Needs user` decision; the address decision is the user's own, from the Task comment); user informed in the Solution Designer's conversation on 2026-11-08
- Supplement approvals: N/A
- Design/review basis invalidated: N/A
- Classification: N/A (before design)
- Handoff: none at this round
- Remaining gaps: none
- Next action: architecture design

### SR-002 — Design: name sources and plain texts

- Phase and classification: Design, `Refinement`
- Trigger: approved SR-001
- Finding IDs: N/A
- Prior status: requirements Approved; design N/A
- Current status: `design-spec.md` Ready
- IDs affected: all requirements mapped to DS-001…DS-005
- Scenario changes: none
- Why recorded: design complete
- Canonical sections changed: `design-spec.md` (new); `investigation-notes.md` (Architecture Investigation Findings); `follow-ups.md` (FU-001)
- Supplements: none
- Intended behavior changed: No
- Approval impact: none; SR-001 approval applies
- Design/review basis: new
- Classification: `task_size = Medium`, `architectural_risk = Low` (one additive field in the in-repository app↔page bridge reply; no server, pairing, credential, Host/Origin, persistence or permission change)
- Handoff: see `solution-handoff.md`, Route
- Downstream impact: implementation per the handoff rules
- Remaining gaps: none
- Next action: hand off per `get_handoff_rules`
