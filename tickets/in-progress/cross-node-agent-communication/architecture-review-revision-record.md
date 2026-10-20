# Architecture Review Revision Record — `cross-node-agent-communication` (slice 1, autobyteus-191)

The latest `design-review-report.md` is authoritative. This record holds the baseline and the review deltas.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / `Architecture Design Complete`, revision 1 | SR-011, SR-012 | N/A | Fail | AR-001, AR-002, AR-003, AR-004 |
| ARCH-REV-002 | Round 2 / SR-013 answers ARCH-REV-001 | SR-013 | Fail | Pass | AR-001 … AR-004 resolved |

## Revision Entries

### ARCH-REV-001 — First review: sound shape; link kinds, engine ownership, existing-copy refusal, target identity

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-node-agent-communication-r2/tickets/in-progress/cross-node-agent-communication/design-review-report.md`
- Review round and trigger: round 1. Triggered by `Architecture Design Complete` (SR-011, commit `9fb04f2ddc`), which revision 1 (SR-012, commit `02933975c6`: naming and premise checks P-1 … P-5) replaced during the review. The review was finished against `02933975c6`.
- Triggering role, report path, and finding IDs: Solution Designer, `handoff-architecture-review.md`; no prior findings.
- Relevant solution revision IDs: SR-011, SR-012
- Prior authoritative decision: N/A
- Current authoritative decision: `Fail` (`Design Impact`)
- What was established: the behavior basis is confirmed for BEH-101 … BEH-107, and the classification `Large` / `High` is confirmed. Persisted data is `Not Affected` (accepted). The activation order, the `delegatedFrom` back-link, `PeerGateway` as the S6 hook and the `RemoteRunChannel` inversion pass. A distributed-deadlock premise was rejected as `Not Reachable` (MP-003). Four design-path findings were raised.

#### Prior Finding Resolution

None.

- New or remaining finding IDs:
  - AR-001 (High): the in-memory link discriminant and the inventory of link walkers.
  - AR-002 (Medium): the engine's remote send and accept entry points.
  - AR-003 (Medium): the existing-copy `delegate_task` with `task_id` to a remote run.
  - AR-004 (Low): `toNodeId` and the response shapes in the contract.
  - Non-blocking: N-1 … N-5.
- Material classification changes: none.
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: RSK-101, RSK-103, RSK-106, RSK-107, RSK-108 as accepted; Linux `host-gateway` still to check in the E2E.

### ARCH-REV-002 — Round 2: all four findings resolved; Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-node-agent-communication-r2/tickets/in-progress/cross-node-agent-communication/design-review-report.md`
- Review round and trigger: round 2; the Solution Designer's SR-013 (commit `910f024ec561d28dd34e05abf17609b0babea638`), answering ARCH-REV-001.
- Triggering role, report path, and finding IDs: Solution Designer, `handoff-architecture-review.md` § Round 2; AR-001 … AR-004, N-1 … N-5.
- Relevant solution revision IDs: SR-013
- Prior authoritative decision: `Fail` (ARCH-REV-001)
- Current authoritative decision: `Pass`
- What changed in the review result: the behavior basis was reconfirmed (SR-013 changes no intended behavior). Each prior finding was checked against the current design spec and the code. Six non-blocking implementation notes (N-6 … N-11) were added.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (High) | Resolved | SR-013; design § Remote Links In Memory; data model item 4 | The store partitions `nodeId` links into `remoteTaskExecutions`, so the existing `"agentRunId" in` walkers cannot see them. `splitTaskExecutions` keeps on-disk entries it did not load, in place (verified, `task-execution-tree-split.ts`). The walker table covers every category from round 1 (include / fence / refuse / exclude). There is a guard test per root kind. The compose shortcut is noted as N-7. |
| AR-002 | Open (Medium) | Resolved | SR-013; design § Remote Delivery In The Engine | The engine's `sendToRemote` / `acceptFromRemote` are named, with the checks that apply and those that don't, the message-ID source (the sender's node) and the log owners (receiver-only / sender-only via `commitSentToRemote`). `RemoteRunLinks` never touches the adapter. Wake placement is noted as N-8. |
| AR-003 | Open (Medium) | Resolved | SR-013; walker table; Interface Boundary Mapping | `REMOTE_SAVED_TASK_NOT_SUPPORTED` in `assignToExistingCopy` before Task resolution, `assertAssignable`, `reopen` or delivery. |
| AR-004 | Open (Low) | Resolved | SR-013; design § Contract Between Nodes | Envelope `{fromNodeId, toNodeId}`; gateway order (mobile credential, `toNodeId`, switch, peer, dispatch); both request bodies and answers carry the responder `nodeId`; HTTP status rules. |
| N-1 … N-5 | Non-blocking | Resolved | SR-013 | `requestId` dropped; prepared-run path (24 h TTL verified); mobile credentials refused; A-09 aligned; the idempotency claim dropped. |

- New or remaining finding IDs: none blocking. N-6 … N-11 are implementation notes.
- Material classification changes: none (`Large` / `High`).
- Recommended recipient: Implementation Engineer; informational notice to the Solution Designer.
- Remaining risks or uncertainty: RSK-101, RSK-103, RSK-106, RSK-107, RSK-108 as accepted; Linux `host-gateway` still to check in the E2E.
