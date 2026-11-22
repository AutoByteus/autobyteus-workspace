# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger | Finding IDs | Prior Status | Current Status | Affected IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Mixed | Initial baseline (Task autobyteus-579) | 576 FU-001…003, 583 FU-002…004, 599 FU-002/003 | N/A | Requirements Approved (within the direction); design Ready | REQ-001…007, AC-001…007 | Baseline; direct implementation (Medium / Low) |

## Revision Entries

### SR-001 — Merged small follow-ups

- **Phase and classification:** `Initial Baseline`.
- **Triggering evidence:** the follow-up rows named in the Task and its comments.
- **Current status:** requirements `Approved`; design `Ready`.
- **Decisions:**
  - DEC-001: `fileContent` refusals become GraphQL errors;
  - DEC-002: each I-2 limit follows its measured cause;
  - DEC-003: TESTING.md is written by API/E2E.
- **Approval:** within the direction; the founder was informed on 2026-11-22.
- **Classification:** `Medium` / `Low`.
- **Handoff:** `solution-designer-handoff.md`.
- **Remaining gaps:** UNK-001 (I-2 causes, measured in implementation).

### Note to SR-001 — DEC-004 evidence decision (AC-003)

- 2026-11-22: API/E2E asked for an evidence decision. The busy-fseventsd regime cannot be reproduced on the host now.
- Decided: use the IMP-08 measurements and a calm whole-E2E run as the evidence. The untested scope is accepted as low risk: the eight I-2 files under a stalled fseventsd.
- Requirements and design are unchanged. Routed to `/api_e2e_engineer` as an Evidence Decision.
