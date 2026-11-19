# Architecture Review Revision Record

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / Architecture Design Complete (2026-11-18) | SR-001, SR-002 | N/A | Fail (Design Impact) | AR-001 |
| ARCH-REV-002 | Round 2 / Design revised SR-003 (2026-11-18) | SR-003 | Fail | Pass | AR-001 (resolved) |

## Revision Entries

### ARCH-REV-001 — Baseline review: a held send's check cannot see queued input

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/send-on-unbound-stream/tickets/in-progress/send-on-unbound-stream/design-review-report.md`
- Review round and trigger: round 1; Solution Designer's `Architecture Design Complete`, `handoff-architecture-design-complete.md` (branch at `8dc5a60205`).
- Triggering role, report path, and finding IDs: Solution Designer; `design-spec.md` at SR-002; N/A.
- Relevant solution revision IDs: SR-001, SR-002.
- Prior authoritative decision: N/A.
- Current authoritative decision: `Fail` — `Design Impact`.
- What changed in the review result or what baseline was established: baseline. D-1, D-2, D-4…D-7, the removal plan and the classification (Medium / High) pass. AR-001: D-3 decides a send lost in flight from the conversation after the rebind snapshot. That snapshot has no queued input (`AGENT_INPUT_STATE` has no turn and is not in it), so a message the node queued while the agent was running is reported "not sent" although the node will run it (MP-001; REQ-002, AC-003).

#### Prior Finding Resolution

None.

- New or remaining finding IDs: AR-001.
- Material classification changes: None.
- Recommended recipient: Solution Designer.
- Remaining risks or uncertainty: ASM-001 largely supported by code (native `raw-trace-item.ts:106`); node-restart overlay edge (non-blocking); one wrong citation (`runProjectionConversation.ts:281`).

### ARCH-REV-002 — Queued input now in the snapshot: Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/send-on-unbound-stream/tickets/in-progress/send-on-unbound-stream/design-review-report.md`
- Review round and trigger: round 2; `handoff-architecture-design-revised-sr-003.md` (branch at `34356a61d8`).
- Triggering role, report path, and finding IDs: Solution Designer; `design-spec.md` and `requirements-doc.md` at SR-003; AR-001.
- Relevant solution revision IDs: SR-003.
- Prior authoritative decision: Fail (ARCH-REV-001).
- Current authoritative decision: Pass.
- What changed in the review result: AR-001 resolved. D-8 puts the active run's input state in the agent stream snapshot, D-3 decides found / `not_sent` (input state present) / `unknown` (null), and REQ-002/REQ-004/AC-003 are refined within the direction. A read-order premise for the input state (MP-002) was checked and rejected as Not Reachable: a pending entry stays in `pendingSnapshot()` until its turn's terminal (`agent-run-input-admission-state.ts:359-369`). Non-blocking implementation note: applying `input_state` removes only `pendingInput` marks, not overlaid stale messages (node-restart edge).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (blocking) | Resolved | SR-003 D-8, D-3, REQ-002, REQ-004, AC-003, DEC-006; `sr-003-send-spines-by-run-kind.md` | `agent-run.ts:478-500` (read without disturbing revisions); `peer-agent-stream.ts:27-37`; `agentInputStateHandler.ts:9-16` |

- New or remaining finding IDs: None.
- Material classification changes: None (Medium / High; node change of D-8 accepted as the design's own escalation).
- Recommended recipient: Implementation Engineer; informational notice to the Solution Designer.
- Remaining risks or uncertainty: stale-overlay implementation note; R-4 peer `unknown` accepted; R-2, FU-001 as recorded.
