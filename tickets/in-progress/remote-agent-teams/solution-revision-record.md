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

### SR-003 — Contract updated; approach validated (2026-10-21)

- Trigger: the user asked to update the contract and validate the approach case by case.
- Contract (`autobyteus-server-ts/docs/design/collaboration_model.md` in this branch):
  - CM-10: the Team link holds the coordinator's and members' run IDs.
  - CM-11: every member is reachable, with waking; every message names its receiving root.
  - CM-12: Agent Teams are offered; members use their own defaults, else the Team's; auto-approve for every agent.
  - § 3 storage now shows the Team on both nodes; § 4 and § 5 are updated.
- Validation: `validation-cases.md`, C-01 … C-31 (Read). Verdict: the approach works. Design points G-1 … G-9, including G-2, a symmetric `targetRoot` on every message.
- Intended behavior changed: `No`.
- Next action: the design.

### SR-004 — Data model refinement (2026-10-21)

- Trigger: the Solution Designer's own review of the data model, asked by the user ("Do you think the data model is clean?"); the user: "If you think this is cleaner, then do it like this."
- Change:
  - A's remote Team link: `coordinatorAgentRunId` → `coordinatorAddress` (the coordinator is a member; one fact, one place; names as in the Team tree).
  - The delegated-runs Team answer uses the same names.
  - In memory, remote links are explicitly kinded (`agent` / `agent_team`).
- Files: `collaboration_model.md` (CM-10, § 3), `validation-cases.md` (G-1, G-7, refinement note), `requirements-doc.md` (Data Continuity).
- Intended behavior changed: `No`.
