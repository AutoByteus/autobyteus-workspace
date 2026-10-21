# Solution Revision Record — `remote-agent-teams` (autobyteus-247)

## Revision Index

| Revision ID | Phase | Trigger | Prior | Current | Result |
| --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | autobyteus-247 from the PTM; the user's approval 2026-10-21 | N/A | Ready for Approval | Presented to the user (DEC-301, DEC-302) |

### SR-001 — Initial baseline (2026-10-21)

- Requirements REQ-301 … REQ-309, AC-301 … AC-306, decisions DEC-301 … DEC-304 (DEC-303 and DEC-304 decided by the Solution Designer).
- Next action: the user answers DEC-301 and DEC-302; then the design.

### SR-002 — Approval: any member linked; Teams before S3 (2026-10-21)

- Trigger: the user, 2026-10-21. Discussion of the local `send_message_to` rules and the on-disk model of local Team copies; "as long as you know the agent run ID … we don't want to limit us"; "Yeah, I think so. I think, great" to the Team link storing the coordinator's and members' run IDs.
- Changes:
  - DEC-301 → (b) any member, both ways, with waking; the members' run IDs are in A's Team link.
  - DEC-302 → Teams now, S3 later.
  - REQ-305 and AC-303 are updated.
  - "Global send across nodes" is recorded as FU-001.
- Approval: the User. Baseline: `requirements-doc.md` at SR-002.
- Next action: update the contract; validate the approach case by case; then the design.
