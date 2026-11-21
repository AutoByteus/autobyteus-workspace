# Solution Revision Record — cross-node-file-transfer-587 (autobyteus-587)

## Revision Index

| Revision ID | Phase | Trigger | Finding IDs | Prior Status | Current Status | Affected IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Task autobyteus-587; investigation 2026-11-21 | — | N/A | Ready for Approval | BEH-001…003, REQ-001…008, AC-001…008, DEC-001…005 | DEC-001…003 put to the founder |
| SR-002 | Requirements | The founder's answers, 2026-11-21 | DEC-001…003 | Ready for Approval | Approved | REQ-004, DEC-001…003 | Workspace files only; 2 GiB per file, 4 GiB per call; the call waits |
| SR-003 | Requirements | The founder: "design the contract file first … make the contract complete" (2026-11-21) | — | Approved | Ready for Approval (supplement) | all; RFC-001 | Contract RFC-001 written: rules, routes, refusals, wire, storage, examples |
| SR-004 | Requirements | The founder: "always … add the node parameter … similar to delegate task"; "Yes include in this ticket" (2026-11-21) | DEC-006 | Ready for Approval (supplement) | Ready for Approval (supplement) | REQ-009, AC-010, RFC-001 RF-14, row 6, refusals | `node` required for every cross-node message |

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

### SR-004 — `node` always names another node

- Trigger: the founder asked why a reply to a linked run needs no `node`, preferred symmetry with `delegate_task`, and approved including it here (2026-11-21).
- Changes: REQ-009, AC-010, DEC-006; RFC-001 RF-14, route row 6, refusals `NODE_REQUIRED`, `NODE_MISMATCH`, example. Replaces autobyteus-191's "follow-ups never name the node" (CM-11 to be updated).
- Approval: DEC-006 by the founder; RFC-001 as a whole still awaits his approval.

- 2026-11-21 (within SR-004): RFC-001 § 3 Storage Layout added (store `<memory>/received-file-store/<sha256>`, `.partial`, per-agent `received_files/<sender's run ID>/<file name>`); RF-7: the same sender's same-named file replaces the earlier one (founder: "we definitely need to replace the existing one"); folder by sender run ID (Solution Designer's recommendation, explained to the founder); examples updated.
