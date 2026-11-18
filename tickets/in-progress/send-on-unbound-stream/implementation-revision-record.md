# Implementation Revision Record

The current code and `implementation-handoff.md` are the authority. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer, `design-review-report.md`, round 2 (Pass) | N/A | `Initial Baseline` | SR-003, ARCH-REV-002; CRR N/A; API-REV N/A; DR N/A | Implemented; ready for code review |

## Revision Entries

### IR-001 — Send only on a bound stream; a message that does not reach the node comes back with a notice

- Triggering role, report path, and round: Architecture Reviewer, `design-review-report.md`, ARCH-REV-002 (Pass).
- Triggering finding IDs: N/A.
- Classification: `Initial Baseline`.
- Prior authoritative result: N/A.
- Current authoritative result: implemented on `codex/send-on-unbound-stream`; see `implementation-handoff.md`.
- Related solution revision IDs: SR-003.
- Related architecture-review revision IDs: ARCH-REV-002.
- Related code-review revision IDs: N/A.
- Related API/E2E revision IDs: N/A.
- Related delivery revision IDs: N/A.
- Why this baseline is recorded: first implementation round of the approved design.
- Approved behavior or requirement IDs affected: REQ-001…REQ-006; BEH-001…BEH-007; AC-001, AC-003…AC-007 (AC-002 real-stack: partly, IMP-08).
- Implementation delta:
  - Server (commit `f70d3cb968`): `input_state` in the agent stream snapshot (D-8); ASM-001 unit; scratch measurement test removed.
  - Web (commit `49ed8967f0`): `whenBound`; ack-awaited sends; sends held across a reconnect and decided after the snapshot; snapshot input state applied in place of the overlay; `MessageNotDeliveredError` and the `'returned_draft'` outcome; the notice; Team and Org classification; the peer route; probes; docs.
- Changed files or areas: see `implementation-handoff.md`, Key Files Or Areas.
- Local validation and result: see `implementation-handoff.md`, Checks Run.
- Next recipient or routing: Code Reviewer (Medium / High).
- Remaining limitations or risks: see `implementation-handoff.md`, Known Risks.
