# Solution Revision Record — cross-node-file-transfer-587 (autobyteus-587)

## Revision Index

| Revision ID | Phase | Trigger | Finding IDs | Prior Status | Current Status | Affected IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Task autobyteus-587; investigation 2026-11-21 | — | N/A | Ready for Approval | BEH-001…003, REQ-001…008, AC-001…008, DEC-001…005 | DEC-001…003 put to the founder |
| SR-002 | Requirements | The founder's answers, 2026-11-21 | DEC-001…003 | Ready for Approval | Approved | REQ-004, DEC-001…003 | Workspace files only; 2 GiB per file, 4 GiB per call; the call waits |
| SR-003 | Requirements | The founder: "design the contract file first … make the contract complete" (2026-11-21) | — | Approved | Ready for Approval (supplement) | all; RFC-001 | Contract RFC-001 written: rules, routes, refusals, wire, storage, examples |

## Revision Entries

### SR-001 — Files across nodes (baseline)

- Trigger: Task autobyteus-587 (founder via the PM, 2026-11-21).
- Shaping findings: two refusal points; the peer gate checks a body's hash after parsing, so files travel in bounded signed pieces (the Memory Sync staging pattern); sending moves data off the machine (DEC-001); runtime tool-call timeouts unknown (DEC-003, UNK-001).
- Approval: pending. Next: the founder's answers, then design.

### SR-002 — Approved

- Trigger: the founder, 2026-11-21: "the agent can only send files in its own workspace" (DEC-001, narrowed from the recommendation: received files are forwarded by copying them into the workspace first), "size limits I agree" (DEC-002), "the tool call will need to wait" (DEC-003 (a)). DEC-004 (one stored copy per node, removed when no run that received it is left) explained to him again on request.
- Approval: `User`; baseline SR-002. Next: architecture design.

### SR-003 — Reference files contract (RFC-001)

- Trigger: the founder, 2026-11-21: design the contract file first, check existing contract files, make clear where storage is when cross-node is used, make the contract complete.
- Found: the canonical collaboration contract (`collaboration_model.md`) has no file rules; no file contract exists. RFC-001 written as a behavior-defining supplement; after delivery its rules become CM-14.
- Approval: pending the founder (supplement). Requirements SR-002 unchanged.
