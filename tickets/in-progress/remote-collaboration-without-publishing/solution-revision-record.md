# Solution Revision Record — `remote-collaboration-without-publishing` (autobyteus-245)

## Revision Index

| Revision ID | Phase | Trigger | Finding IDs | Prior Status | Current Status | Affected IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | autobyteus-245 from the PTM; the user's direction of 2026-10-21 | N/A | N/A | Ready for Approval | BEH-201…204, REQ-201…209, AC-201…208, SCN-201…203, DEC-201…206 | Presented to the user |

## Revision Entries

### SR-001 — Initial baseline (2026-10-21)

- Phase and classification: Requirements / `Initial Baseline`.
- Trigger: autobyteus-245 (FU-007 of autobyteus-191) with the user's direction: no publishing; all agents and teams automatically available; refuse when no default configuration.
- Prior status: N/A. Current: requirements `Ready for Approval`; design not started.
- Decisions:
  - DEC-201: the agent default runtime/model, with the user's refusal wording.
  - DEC-206: the contract field is renamed to `address`.
  - Needs user: DEC-202 (workspace), DEC-203 (auto-approve), DEC-204 (leftover file, acknowledgement), DEC-205 (245/247 in sequence or merged).
- Intended behavior changed: N/A (baseline).
- Approval impact: not approved.
- Next action: the user answers; then architecture.
