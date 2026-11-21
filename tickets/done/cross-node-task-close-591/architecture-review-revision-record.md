# Architecture Review Revision Record: cross-node-task-close-591

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / SR-006 handoff | SR-004 … SR-006 | N/A | Fail | AR-001 |
| ARCH-REV-002 | Round 2 / SR-007, AR-001 answered | SR-007 | Fail | Fail | AR-001 (resolved), AR-002 |
| ARCH-REV-003 | Round 3 / SR-008, AR-002 answered | SR-008 | Fail | Pass | AR-002 (resolved) |
| ARCH-REV-004 | Round 4 / SR-009, B's closed delegations as one node record | SR-009 | Pass | Pass | None (two notes) |
| ARCH-REV-005 | Round 5 / SR-010, local continuation (DN-9) | SR-010 | Pass | Fail | AR-003 |
| ARCH-REV-006 | Round 6 / SR-011, one gate for every peer message | SR-011 | Fail | Pass | AR-003 (resolved) |

## Revision Entries

### ARCH-REV-001 — Baseline: delegation-state notices across nodes, and remote re-delegation

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-node-task-close-591/tickets/in-progress/cross-node-task-close-591/design-review-report.md`
- Review round and trigger: 1; the Solution Designer's handoff of SR-006 (`39973b9e1a`)
- Triggering role, report path, and finding IDs: Solution Designer; `handoff-architecture-review-sr006.md`; AR-001
- Relevant solution revision IDs: SR-004 … SR-006
- Prior authoritative decision: N/A
- Current authoritative decision: `Fail`
- What changed in the review result or what baseline was established:
  - The structure is sound: one owner per node, the link request behind `admit` and the owner link check, the owed mark with a 30 s per-peer retry, and compatible optional fields.
  - U-1 is verified (`task-delegation.ts:374-375`).
  - AR-001: nothing orders a run's in-flight "closed" notice, B's stop and the re-delegated work, so a stale closure can stop a re-delegated run mid-work.
  - Notes: DN-5 must parse and carry the field, not only tolerate it, and DN-8's delivery path.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: AR-001
- Material classification changes: none
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: DN-6's list signal (to verify by the implementation)

### ARCH-REV-002 — SR-007: per-run ordering; DN-8's delivery path checked

- Canonical design review report: same path as above
- Review round and trigger: 2; SR-007 (`bc2cccfd8c`), answering AR-001 and notes 1 and 2
- Triggering role, report path, and finding IDs: Solution Designer; `design-spec.md` DN-1b and DN-8; AR-001, AR-002 (new)
- Relevant solution revision IDs: SR-007
- Prior authoritative decision: `Fail` (ARCH-REV-001)
- Current authoritative decision: `Fail`
- What changed in the review result:
  - AR-001 is resolved by DN-1b, and note 1 by the typed fields.
  - The design's "to verify" for DN-8 was answered by reading the code, and both premises fail. The conversation check reads A's memory, and `crossRun.route` returns `null` for a peer run. That is AR-002, pointing to `senderRoot.deliverToPeerRun`.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (Design Impact) | Resolved | SR-007 | DN-1b; `toExistingRun` awaits `settled(run)`; B answers after its Stop |

- New or remaining finding IDs: AR-002
- Material classification changes: none
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: DN-6's list signal

### ARCH-REV-003 — SR-008: remote re-delegation through the existing peer delivery

- Canonical design review report: same path as above
- Review round and trigger: 3; SR-008 (`ed9c473b3a`), answering AR-002
- Triggering role, report path, and finding IDs: Solution Designer; `design-spec.md` DN-8; AR-002
- Relevant solution revision IDs: SR-008
- Prior authoritative decision: `Fail` (ARCH-REV-002)
- Current authoritative decision: `Pass`
- What changed in the review result: a remote run skips A's conversation check, and `toExistingRun` delivers through a passed-in `deliverToPeerRun` port. That port is the router's peer core, extracted once as `deliverMessageToPeerRun`, and it runs inside DN-1b's sequence. A two-node AC-007 test is added.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-002 | Open (Design Impact) | Resolved | SR-008 | DN-8: conversation check skipped for `nodeId`; `deliverToPeerRun` port = extracted `deliverMessageToPeerRun` |

- New or remaining finding IDs: none
- Material classification changes: none
- Recommended recipient: Implementation Engineer; then a notice to the Solution Designer
- Remaining risks or uncertainty: DN-6's list signal; the extraction keeps the router's behavior

### ARCH-REV-004 — SR-009: B's closed delegations as one node record

- Canonical design review report: same path as above
- Review round and trigger: 4; SR-009 (`ccb3ed40ef`), the Implementation Engineer's Design Impact on DN-6
- Triggering role, report path, and finding IDs: Solution Designer; `design-spec.md` DN-5 and DN-6; none
- Relevant solution revision IDs: SR-009
- Prior authoritative decision: `Pass` (ARCH-REV-003)
- Current authoritative decision: `Pass`
- What changed in the review result: B's closed state moves from the run files to one node record (`ClosedDelegations`), read once, with the filter at the listing's `topLevel` predicate. I verified that the index readers are strict (`agent-run-history-index-store.ts:15-25, 76-77`), so an index-row flag would break rollback.

#### Prior Finding Resolution

None open.

- New or remaining finding IDs: none
- Material classification changes: none
- Recommended recipient: Implementation Engineer; then a notice to the Solution Designer
- Remaining risks or uncertainty: remove deleted runs' entries; DN-6's live signal

### ARCH-REV-005 — SR-010: the assigner's message continues a closed remote run

- Canonical design review report: same path as above
- Review round and trigger: 5; SR-010 (`e689ab1009`), from the code reviewer's CRR-002 after API/E2E round 1
- Triggering role, report path, and finding IDs: Solution Designer; `code-review-report.md`; AR-003 (new)
- Relevant solution revision IDs: SR-010
- Prior authoritative decision: `Pass` (ARCH-REV-004)
- Current authoritative decision: `Fail`
- What changed in the review result: the requirement corrections follow the local rule and DEC-004, and DN-9's rules are sound. But `admitPeerRun` misses the run-ID path through the sender root's peer endpoint (router `:88-103`; the roots' `deliverExact` send with no closed check; `peerChildrenOf` includes closed runs). That is AR-003.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Resolved | Resolved | SR-007 | DN-1b unchanged |
| AR-002 | Resolved | Resolved | SR-008 | DN-8 unchanged for a different Task |

- New or remaining finding IDs: AR-003
- Material classification changes: none
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: DN-6's signal

### ARCH-REV-006 — SR-011: one gate for every peer message

- Canonical design review report: same path as above
- Review round and trigger: 6; SR-011 (`d521a755cb`), answering AR-003
- Triggering role, report path, and finding IDs: Solution Designer; `design-spec.md` DN-9 and S-4b; AR-003
- Relevant solution revision IDs: SR-011
- Prior authoritative decision: `Fail` (ARCH-REV-005)
- Current authoritative decision: `Pass`
- What changed in the review result: `admitPeerRun` runs once at the router's head, outside any root's gate, before the node, sender-root and `route` paths. The duplicate checks are removed, and the tests cover the root-endpoint path.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-003 | Open (Design Impact) | Resolved | SR-011 | DN-9: the gate at `GlobalAgentRunMessageRouter.deliver`'s head; `closedPeerRunRefusal` removed |

- New or remaining finding IDs: none
- Material classification changes: none
- Recommended recipient: Implementation Engineer; then a notice to the Solution Designer
- Remaining risks or uncertainty: DN-6's signal; the extraction
