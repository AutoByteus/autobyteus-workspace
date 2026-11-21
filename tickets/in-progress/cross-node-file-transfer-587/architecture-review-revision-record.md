# Architecture Review Revision Record — cross-node-file-transfer-587 (autobyteus-587)

The latest `design-review-report.md` is authoritative.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / Architecture Design Complete (Large, High) | SR-001 … SR-007 | N/A | Fail | AR-001 … AR-006 |
| ARCH-REV-002 | Round 2 / SR-008 (fixes for ARCH-REV-001; DEC-007, DEC-008) | SR-008 | Fail | Pass | AR-001 … AR-006 resolved; AR-007 new (non-blocking) |

## Revision Entries

### ARCH-REV-001 — Initial review: Memory Sync, placement order, sweep window

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-node-file-transfer-587/tickets/in-progress/cross-node-file-transfer-587/design-review-report.md`
- Review round and trigger: round 1; Solution Designer handoff 2026-11-21, commit `08f8e18c31` (base `fbe714f8bb`).
- Triggering role, report path, and finding IDs: Solution Designer; N/A.
- Relevant solution revision IDs: SR-001 … SR-007.
- Prior authoritative decision: N/A.
- Current authoritative decision: `Fail`.
- What baseline was established: the behavior basis is confirmed against RFC-001. Workspace containment holds for every sender kind; `recipient_address` reaches local runs only; the package validator is unaffected by `received_files/`. Six findings were opened.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: AR-001 (Requirement Gap + Design Impact, High), AR-002 (Design Impact, Medium), AR-003 (Design Impact, Medium), AR-004 (Design Impact, Low), AR-005 (Design Impact, Low), AR-006 (Requirement Gap + Design Impact, Low).
- Material classification changes: None (`Large`/`High` confirmed).
- Recommended recipient: Solution Designer.
- Remaining risks or uncertainty: reading the validated path once; concurrent uploads of one content; runtimes without a tool limit; two-node behavior until the E2E runs.

### ARCH-REV-002 — SR-008: Memory Sync skips received files; placement after admission; sweep grace; Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-node-file-transfer-587/tickets/in-progress/cross-node-file-transfer-587/design-review-report.md`
- Review round and trigger: round 2. SR-008 at `eac8cf3814` (Solution Designer's message, 2026-11-21).
- Triggering role, report path, and finding IDs: Solution Designer; `solution-revision-record.md` § SR-008; AR-001 … AR-006.
- Relevant solution revision IDs: SR-008.
- Prior authoritative decision: `Fail` (ARCH-REV-001).
- Current authoritative decision: `Pass`.
- What changed in the review result: I redrew the receiving node's order (verify in the root → the engine's admission checks and reservation → `RootCommunicationPort.placeReceivedFiles` → input → commit; work packet: link, verify, `readyHost`, place, post), the sweep (24 h grace; `status` and completion touch) and DS-005 (`peerRunAdmission` on the `node` step). I confirmed that `closedPeerRunRefusal` exists at base (`cross-run-message-delivery.ts:142`, router `:196`), so the rename is real. The report's structural verdicts were condensed into one round-2 table.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (High) | Resolved | SR-008, DEC-007 | Founder decided (a): "memory sync should not copy files"; Change Scope row (Memory Sync path policy skips any `received_files` segment); AC-011; sequence step 6 |
| AR-002 | Open (Medium) | Resolved | SR-008 | § Ownership Map "Order on the receiving node": every admission refusal before placement; placement through a port method the engine calls in its own sequence; the work packet places after `readyHost`; the remaining I/O case is in Risks |
| AR-003 | Open (Medium) | Resolved | SR-008 | DS-004: unlinked and untouched for 24 h; `status` and completion touch the entry |
| AR-004 | Open (Low) | Resolved | SR-008 | Removal plan row for `RemoteMessageSend.send` / `RemoteMessageSendInput` with their callers |
| AR-005 | Open (Low) | Resolved | SR-008 | DS-005: `CrossRunMessageDelivery.peerRunAdmission({node, agentRunId})` answers CLOSED or `NODE_MISMATCH` from the Task entry |
| AR-006 | Open (Low) | Resolved | SR-008, DEC-008 | DEC-005 superseded by RF-7; notes mark RFC-001 Approved; DEC-008 records AC-009's evidence ((b) Codex/Claude, (c) AGY/Grok/ACP with FU-001) |

- New or remaining finding IDs: AR-007 (Design Impact, Low, non-blocking): the DS-001/DS-002 spine lines still show placement before the engine; DS-005's no-`node` branch still names `closedPeerRunRefusal`; no entry-form row for a wrong `node` from a non-linking sender.
- Material classification changes: None (`Large`/`High`).
- Recommended recipient: implementation engineer (primary); Solution Designer (informational, with AR-007).
- Remaining risks or uncertainty: a log-append I/O failure after placement; AGY/Grok/ACP limits unverified (FU-001); concurrent uploads of one content; two-node behavior until the E2E runs.
