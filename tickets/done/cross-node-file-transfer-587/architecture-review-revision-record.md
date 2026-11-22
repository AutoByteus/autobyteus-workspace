# Architecture Review Revision Record — cross-node-file-transfer-587 (autobyteus-587)

The latest `design-review-report.md` is authoritative.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / Architecture Design Complete (Large, High) | SR-001 … SR-007 | N/A | Fail | AR-001 … AR-006 |
| ARCH-REV-002 | Round 2 / SR-008 (fixes for ARCH-REV-001; DEC-007, DEC-008) | SR-008 | Fail | Pass | AR-001 … AR-006 resolved; AR-007 new (non-blocking) |
| ARCH-REV-003 | Round 3 / SR-010 (after code review CRR-008 and the 591 merge) | SR-010 | Pass | Pass | AR-007 carried (non-blocking); AR-008 new (non-blocking) |
| ARCH-REV-004 | Round 4 / SR-011 (AR-008 answered; AR-007 spine lines) | SR-011 | Pass | Pass | AR-007, AR-008 resolved |

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

### ARCH-REV-003 — SR-010: one order on the `node` path, one owner of RF-14, saved Task files; Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-node-file-transfer-587/tickets/in-progress/cross-node-file-transfer-587/design-review-report.md`
- Review round and trigger: round 3. SR-010 at `beb161d299` (Solution Designer's message, 2026-11-21) after code review CRR-008 (CR-587-01 Design Impact; CR-587-02 … 05; FU-007) and the autobyteus-591 merge (IR-004).
- Triggering role, report path, and finding IDs: Solution Designer; `design-spec.md` § Revision SR-010; `solution-revision-record.md` § SR-010; `code-review-report.md` CR-587-01 … 05.
- Relevant solution revision IDs: SR-010.
- Prior authoritative decision: `Pass` (ARCH-REV-002).
- Current authoritative decision: `Pass`.
- What changed in the review result:
  - I confirmed CR-587-01 in the merged code: the router runs `admitPeerRun` (`:100`) before `RemoteMessageSend` uploads (`:50`). R1 has the router own one order, with the upload before any Task-state change.
  - `PeerRunNodes` replaces four RF-14 sites with one owner.
  - R3's existing-copy path is one `TaskDelegation` sequence, so the upload slots in before `assignExistingTaskExecution`.
  - The RF-3 exception follows DEC-001's visible-step model; agents can attach any app-accepted file to a Task (recorded as a residual, not a finding).
  - The report gained § SR-010 Delta Review.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 … AR-006 | Resolved | Resolved (unchanged) | SR-008 | SR-010 does not reopen them; R1 keeps the receiving-node order of AR-002 |
| AR-007 | Open (non-blocking) | Open (non-blocking, carried) | SR-010 | DS-001/DS-002/DS-005 still show the older shapes; § Revision SR-010 governs |

- New or remaining finding IDs: AR-008 (Requirement Gap, Low, non-blocking): RF-14 "for both tools" against row 4c, which gives a remote copy a saved Task without `node`, as 591 shipped. Build 4c as the row reads; scope RF-14's wording at the next revision.
- Material classification changes: None (`Large`/`High`).
- Recommended recipient: implementation engineer (primary); Solution Designer (informational, with AR-007 and AR-008).
- Remaining risks or uncertainty: a full upload before a predictable CLOSED refusal for a non-assigner (swept after 24 h); the existing-copy upload's place after the read-only checks; the RF-3 exception's reach; AGY/Grok/ACP limits (FU-001); two-node behavior until the E2E runs.

### ARCH-REV-004 — SR-011: `node` on the existing-copy form; spine lines; Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-node-file-transfer-587/tickets/in-progress/cross-node-file-transfer-587/design-review-report.md` (§ SR-011 Delta Review)
- Review round and trigger: round 4. SR-011 at `74abb1a886` (the Solution Designer's informational message offering a recheck, 2026-11-21).
- Triggering role, report path, and finding IDs: Solution Designer; `solution-revision-record.md` § SR-011; AR-007, AR-008.
- Relevant solution revision IDs: SR-011.
- Prior authoritative decision: `Pass` (ARCH-REV-003).
- Current authoritative decision: `Pass`.
- What changed in the review result: RF-14 now applies to all three forms. `PeerRunNodes` has a second caller (the existing-copy path, called first), and the `delegate_task` contract gains `node` in that mode. The spine lines are redrawn.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-007 | Open (non-blocking) | Resolved | SR-011 | DS-001 (R3 note), DS-002 (R1 order with the AR-002 receiving order), DS-005 (`PeerRunNodes`, two callers) |
| AR-008 | Open (non-blocking) | Resolved | SR-011 | RF-14 "for both tools and every form"; row 4c with `node`; AC-012 with the refusals; DEC-006 note; design § Revision SR-010 "`node` on the existing-copy form" |

- New or remaining finding IDs: None.
- Material classification changes: None (`Large`/`High`).
- Recommended recipient: implementation engineer (primary); Solution Designer (informational).
- Remaining risks or uncertainty: 591's tests and fixtures of the existing-copy form without `node` change; the ARCH-REV-003 residuals stand.
