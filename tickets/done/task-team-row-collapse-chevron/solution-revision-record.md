# Solution Revision Record — task-team-row-collapse-chevron

## SR-001 — Initial requirements baseline (2026-09-29)

- Trigger: user request + screenshot (delegated Team row has no chevron in Agent Org tree).
- Prior status: N/A. Current status: Requirements `Ready for Approval`.
- Affected IDs: BEH-001..003, REQ-001..006, AC-001..005, OQ-001, OQ-002.
- Canonical sections: `requirements-doc.md` (all), `investigation-notes.md` (E-001..E-007).
- Approval: pending. Design: not started (N/A until approval). Review/routing: N/A.
- Remaining gaps: OQ-001 default state, OQ-002 row-click behavior.

## SR-002 — User decision on row click (2026-09-29)

- Trigger: user reply "when I click the row ... it will collapse. So it's the same for agent team, for the task team as well."
- Prior status: Ready for Approval (SR-001). Current status: Ready for Approval (OQ-001 confirmation pending).
- Affected IDs: BEH-002, REQ-006, AC-004, OQ-002 (resolved).
- Approval: OQ-002 decided by user; OQ-001 default state awaiting explicit confirmation. Design: not started.

## SR-003 — Requirements approved + design (2026-09-29)

- Trigger: user reply "Okay, then start open." (OQ-001).
- Prior status: Ready for Approval (SR-002). Current status: Requirements `Approved`; design `Complete`.
- Affected IDs: REQ-005, OQ-001 (resolved); all REQ/AC now approved.
- Canonical sections: `requirements-doc.md` status + REQ-005; new `design-spec.md`.
- Approval basis: explicit user approval of SR-003 baseline in conversation.
- Classification: task_size Small, architectural_risk Low (see design-spec.md).
- Remaining gaps: none blocking. Residual: no auto-reveal of a user-collapsed task Team when a hidden member is selected elsewhere (non-goal).
