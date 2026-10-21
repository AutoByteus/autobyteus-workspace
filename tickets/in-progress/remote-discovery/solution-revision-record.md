# Solution Revision Record — remote-discovery (autobyteus-261)

## Revision Index

| SR | Date | Phase | Summary |
| --- | --- | --- | --- |
| SR-001 | 2026-10-21 | Requirements | Baseline for the user's approval |
| SR-002 | 2026-10-21 | Requirements | The user's decisions; approved |

## Revision Entries

### SR-001 — Requirements baseline (2026-10-21)

- Trigger: the PTM's delegation of autobyteus-261 (with FU-002/FU-003 of 247 merged in) and its answer on autobyteus-260.
- Prior status: N/A. Current status: `Ready for Approval`.
- Affected: REQ-401 … REQ-409, AC-401 … AC-407, DEC-401 … DEC-408.
- Approval: pending (DEC-401, DEC-402, DEC-406, the DEC-407 texts, DEC-408).
- Next: the user's decisions in the conversation.
- SR-001 addendum (same day): the PTM sent the full Task text. Added AC-408 (the user's desktop ↔ Docker check, both directions) and the S6 note on claimed identity. No other differences from the summary.

### SR-002 — The user's decisions; requirements approved (2026-10-21)

- Trigger: the user's answer in the conversation (quoted in the requirements doc's status).
- Changes: DEC-401 (a), a separate `list_available_nodes`. DEC-402: `status` is `available` or `unavailable`; the reason comes from `list_available_agents` with that node. DEC-403: no name filter (REQ-404, AC-403 and BEH-403 removed). DEC-406: the wording is delegated to the Solution Designer. DEC-408: 262 stays separate.
- Status: `Ready for Approval` → `Approved` (the user).
- Next: architecture design.
