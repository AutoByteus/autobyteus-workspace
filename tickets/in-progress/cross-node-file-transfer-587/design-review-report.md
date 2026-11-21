# Design Review Report — cross-node-file-transfer-587 (autobyteus-587)

## Review Round Meta

- Upstream Requirements Doc: `tickets/in-progress/cross-node-file-transfer-587/requirements-doc.md` (Approved; status SR-008 with DEC-005 corrected, DEC-007, DEC-008, AC-011)
- Upstream Investigation Notes: `tickets/in-progress/cross-node-file-transfer-587/investigation-notes.md`
- Upstream Solution Revision Record: `tickets/in-progress/cross-node-file-transfer-587/solution-revision-record.md` (SR-001 … SR-008)
- Reviewed Design Spec: `tickets/in-progress/cross-node-file-transfer-587/design-spec.md` (Ready, SR-008)
- Supplemental Task Artifacts Reviewed: `reference-files-contract.md` (RFC-001, Approved, behavior-defining); `handoff-architecture-review.md`; `follow-ups.md` (none)
- Relevant Solution Revision IDs: SR-001 … SR-008
- Architecture Review Revision Record: `tickets/in-progress/cross-node-file-transfer-587/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-002`
- Current Review Round: 2
- Trigger: SR-008 (commit `eac8cf3814`), which revises the design for ARCH-REV-001 and records the founder's DEC-007. Round 1 reviewed SR-007 (`08f8e18c31`). The founder delegated design approval to the Solution Designer's walkthrough plus this review, so design approval is not `Pending`.
- Prior Review Round Reviewed: 1 (ARCH-REV-001, `Fail`)
- Latest Authoritative Round: 2
- Current-State Evidence Basis: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-node-file-transfer-587`, branch `codex/cross-node-file-transfer-587` at `eac8cf3814` (round 2 also checked `closedPeerRunRefusal` at base: `cross-run-message-delivery.ts:109,142`, router `:70,196`); all code read at the committed base `fbe714f8bb` with `git show`. Files opened:
  - Memory Sync: `local-memory-export-scanner.ts`, `memory-sync-path-policy.ts`, `memory-sync-transfer-limits.ts`.
  - Run folders: `root-run-package-current-validator.ts`.
  - Runs and workspaces: `agent-run-config.ts`, `configured-agent-execution-handle.ts:455-482`, `workspace-manager.ts:205-225`.
  - Message routing and remote send: `send-message-to-dispatcher.ts:84-125`, `collaboration-tree.ts:140-215`, the callers of `deliverExactAgentMessage`, `remote-message-send.ts`, `standalone-root-message-delivery.ts:105-120`.
  - Closed-Task check: `standalone-agent-run-root.ts:131,294-301`.

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Classification rationale reviewed: an inter-node contract change, new persisted data, a security boundary (files leaving a machine), a changed message rule (CM-11) and deletion semantics.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None.

## Upstream Behavior And Production-Path Basis Confirmation

- Round 2: AR-001 … AR-006 are resolved (evidence in the ARCH-REV-002 table of the revision record). The rest of this section records the round-1 basis, which still holds.
- Overall Basis Status: `Confirmed` (round 2). DEC-007 (the founder) settles AR-001; DEC-005 is corrected; DEC-008 records AC-009's evidence.
- Approved requirements / intended behavior understood:
  - Cross-node `delegate_task` and `send_message_to` carry `reference_files`, which are copied: "nothing is shared implicitly".
  - Only workspace files can be sent (DEC-001). Limits: 2 GiB per file, 4 GiB per call (DEC-002). The call waits (DEC-003).
  - All or nothing (RF-5).
  - Storage: a node-level copy per content at `<data>/received_files/`; a read-only hard link per receiving agent at `received_files/<sender run ID>/<name>`; same-sender replacement (RF-7); deleted with the run's history (RF-10).
  - `node` is required for every cross-node send (RF-14).
- Relevant existing behavior and evidence confirmed:
  - The two refusal points. The engine forces `referenceFiles: []` on remote lines.
  - The peer gate checks the body hash after parsing, so pieces must be bounded.
  - Memory Sync's piece protocol.
  - Team and Org members get a `workspaceId` from their launch `workspaceRootPath` (`configured-agent-execution-handle.ts:456-473`), so RF-3 works for every sender kind; `null` → `NO_WORKSPACE`.
  - `recipient_address` resolves only local runs (step 2 walks local assigners, `collaboration-tree.ts:148-165`), so RF-14 strands no address-based send.
  - Only the router calls `deliverExactAgentMessage`.
- Scope guardrail confirmed: UC-001…004 are in scope. Out of scope: NFS, folders, transfers without a message or delegation, progress, unpaired nodes, release.
- Every prospective blocking `Design Impact` finding is traceable to an approved requirement, acceptance criterion, or preserved-behavior ID: `Yes` (AR-002 → RF-5/REQ-006; AR-003 → RF-5/RF-11/REQ-006/REQ-007, AC-001/AC-007; AR-004 → Principle 7; AR-005 → RF-14/REQ-009/AC-010).
- Remaining material ambiguity: AR-001 (whether received files go to the memory hub).
- Statements about existing code the design relies on: the cited lines match. The design misses one consumer: "Left alone: Memory Sync" (Change Scope), while Memory Sync's scanner walks every regular file under `memory/agents` and `memory/agent_teams` (AR-001).

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 (route 4) | Contract | Pass | Pass | Pass | Confirmed | Work packet: link check, verify, `readyHost`, then place, then post |
| BEH-002 (routes 5–6) | Contract | Pass | Pass | Pass | Confirmed | `acceptFromRemote` places only after its admission checks and the reservation (§ Order on the receiving node) |
| BEH-003 | Contract | Pass | Pass | Pass | Confirmed | DEC-007 (a): Memory Sync skips `received_files/`; AC-011 |
| RF-10 / UC-004 | Contract | Pass | Pass | Pass | Confirmed | Sweep: unlinked and untouched for 24 h; `status`/completion touch |
| RF-14 | Contract | Pass | Pass | Pass | Confirmed | `RemoteMessageSend.send` in the removal plan; `peerRunAdmission` answers CLOSED or `NODE_MISMATCH` |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `reference-files-contract.md` (RFC-001) | Pass | Pass | Pass | Pass | Pass | Round 2: DEC-005 points to RF-7; the notes mark RFC-001 Approved |

## Structural Verdicts (round 2)

Round 1's verdicts that passed still hold, and the ones that failed now pass:

| Check | Round 2 Verdict | Evidence |
| --- | --- | --- |
| Task design health | Pass | Unchanged |
| Spines DS-001 … DS-005 | Pass | DS-004 (sweep with a 24 h grace period and touch) and DS-005 (`peerRunAdmission` on the `node` step) redrawn. The order on the receiving node is explicit in § Ownership Map "Order on the receiving node (AR-002)". See AR-007 for leftover wording in the primary spine lines |
| Boundary encapsulation (roots' accept steps) | Pass | The root's accept only verifies; the engine drives placement through `RootCommunicationPort.placeReceivedFiles`, a port method in its own sequence, not a callback (Case 1) |
| Dependency direction / Principle 16 | Pass | Unchanged |
| Interfaces; empty indirection | Pass | + `ReceivedFiles.verify`, `RootCommunicationPort.placeReceivedFiles`, `CrossRunMessageDelivery.peerRunAdmission` |
| Capability reuse (agent-folder consumers) | Pass | Memory Sync is listed in Change Scope with the DEC-007 path-policy rule |
| Allocation (RF-14 owners) | Pass | — |
| Reusable structures, data tightness, derived consumers, vocabulary | Pass | Memory Sync is now among the derived consumers |
| File responsibility and placement | Pass | Unchanged; + the Memory Sync path policy |
| Removal completeness | Pass | `RemoteMessageSend.send` and `RemoteMessageSendInput` listed with evidence |
| Legacy / compatibility | Pass | Unchanged |
| Persisted data | Pass | `Not Affected` (new data only) |
| Change sequence | Pass | Step 6 adds the Memory Sync rule |
| Examples | Pass | DS-005 now covers a wrong `node` from a non-linking sender (an entry-form row would make it plain; see AR-007) |

## Material Premise Validation (Only When Needed)

- `MP-001` (received files to the memory hub): handled by DEC-007 (a) and AC-011.
- `MP-002` (replacement before a refusal): handled. Every admission refusal of `acceptFromRemote` and `readyHost` for a work packet now comes before placement. The only case left is an I/O failure of the log append after placement, recorded in the design's Risks. It is not a supported product scenario (infrastructure failure, Principle 6) and needs no machinery.
- `MP-003` (the sweep removes a completed file still in use): handled by the 24 h grace period and the touch on `status`/completion. A call lasts at most about 27 minutes.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass` (round 2). The upstream behavior basis is confirmed, the design is ready for implementation, and no in-scope machinery or finding depends on an unsupported material premise.

## Findings

No blocking finding. AR-001 … AR-006 are resolved (see ARCH-REV-002 in the revision record).

### AR-007 — Primary spine lines still show the old order and name (non-blocking)

- Type: `Design Impact`; severity: Low; blocking: No.
- Protects: Principle 14 (the spine is the reading order); the AR-002 order.
- Problem:
  - DS-002 still reads `root.acceptRemoteMessage | acceptPeerRunMessage → ReceivedFiles.placeFor → engine.acceptFromRemote`, and DS-001 reads `root.acceptRemoteWorkPacket → ReceivedFiles.placeFor → work packet`. Both contradict § Ownership Map "Order on the receiving node", which is correct: verify in the root, then the engine's checks, then placement through the port.
  - DS-005's no-`node` branch still names `closedPeerRunRefusal`, which SR-008 renames `peerRunAdmission`.
  - The entry-form table has no row for a wrong `node` from a non-linking sender.
- Why not blocking: the explicit order section and the AR-005 sentence in DS-005 are unambiguous, and the implementer follows them.
- Required update: at the next revision, redraw DS-001/DS-002 in the AR-002 order, rename the method in DS-005's no-`node` branch, and add the entry-form row. Until then, the Ownership Map's order section governs.
- Recipient: Solution Designer (correction); implementation engineer (follow the Ownership Map order).

## Classification

N/A (Pass). AR-007 is a non-blocking `Design Impact`.

## Recommended Recipient

Implementation engineer (primary). Solution Designer (informational, with AR-007).

## Residual Risks

These are for implementation and validation; none blocks.

- A log-append I/O failure after placement leaves a placed file without its message (design Risks). This is infrastructure failure, so no machinery is required.
- AGY/Grok/ACP tool-call limits accepted unverified (DEC-008, FU-001). A long transfer there fails cleanly.
- Concurrent uploads of one content: an offset mismatch answers `{receivedBytes}`, and the sender resumes. Test two senders of the same file at once.
- The copy fallback (no hard link) loses deduplication on that node (RF-7).
- Two-node behavior stays unverified until the two-server E2E runs (AC-001 … AC-007, AC-010).

## Latest Authoritative Result

- Review Decision: `Pass` (ARCH-REV-002)
- Material-Premise Gate: `Pass`. MP-001 … MP-003 are handled.
- Notes: `task_size=Large`, `architectural_risk=High`. The package is ready for implementation at SR-008 (`eac8cf3814`). AR-007 is a non-blocking wording correction.
