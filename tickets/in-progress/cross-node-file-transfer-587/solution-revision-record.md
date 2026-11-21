# Solution Revision Record — cross-node-file-transfer-587 (autobyteus-587)

## Revision Index

| Revision ID | Phase | Trigger | Finding IDs | Prior Status | Current Status | Affected IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Task autobyteus-587; investigation 2026-11-21 | — | N/A | Ready for Approval | BEH-001…003, REQ-001…008, AC-001…008, DEC-001…005 | DEC-001…003 put to the founder |

## Revision Entries

### SR-001 — Files across nodes (baseline)

- Trigger: Task autobyteus-587 (founder via the PM, 2026-11-21).
- Shaping findings: two refusal points; the peer gate checks a body's hash after parsing, so files travel in bounded signed pieces (the Memory Sync staging pattern); sending moves data off the machine (DEC-001); runtime tool-call timeouts unknown (DEC-003, UNK-001).
- Approval: pending. Next: the founder's answers, then design.
