# Design Review Report — cross-node-file-transfer-587 (autobyteus-587)

## Review Round Meta

- Upstream Requirements Doc: `tickets/in-progress/cross-node-file-transfer-587/requirements-doc.md` (Approved, SR-005)
- Upstream Investigation Notes: `tickets/in-progress/cross-node-file-transfer-587/investigation-notes.md`
- Upstream Solution Revision Record: `tickets/in-progress/cross-node-file-transfer-587/solution-revision-record.md` (SR-001 … SR-007)
- Reviewed Design Spec: `tickets/in-progress/cross-node-file-transfer-587/design-spec.md` (Ready, SR-007)
- Supplemental Task Artifacts Reviewed: `reference-files-contract.md` (RFC-001, Approved, behavior-defining); `handoff-architecture-review.md`; `follow-ups.md` (none)
- Relevant Solution Revision IDs: SR-001 … SR-007
- Architecture Review Revision Record: `tickets/in-progress/cross-node-file-transfer-587/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-001`
- Current Review Round: 1
- Trigger: Solution Designer handoff "Architecture Design Complete", `Large`/`High`, 2026-11-21. The founder delegated design approval to the Solution Designer's walkthrough plus this review, so design approval is not `Pending`.
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Current-State Evidence Basis: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-node-file-transfer-587`, branch `codex/cross-node-file-transfer-587` at `08f8e18c31`; all code read at the committed base `fbe714f8bb` with `git show`. Files opened:
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

- Overall Basis Status: `Confirmed`, with one product question the design does not raise (AR-001) and stale or unanswered items in the requirements (AR-006).
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
| BEH-001 (route 4) | Contract | Pass | Pass | Fail | Needs Correction | AR-002 (placement before the work packet's last checks), AR-003 |
| BEH-002 (routes 5–6) | Contract | Pass | Pass | Fail | Needs Correction | AR-002, AR-003, AR-005 |
| BEH-003 | Contract | Fail | Pass | Fail | Needs Correction | AR-001 (received files leave the node through Memory Sync) |
| RF-10 / UC-004 | Contract | Pass | Pass | Fail | Needs Correction | AR-003 (the sweep's window) |
| RF-14 | Contract | Pass | Pass | Fail | Needs Correction | AR-004 (dead path), AR-005 (`NODE_MISMATCH` for non-linking senders) |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `reference-files-contract.md` (RFC-001) | Pass | Pass | Pass | Fail | Pass | AR-006: the requirements' DEC-005 still says `received_files/<first 12 hex>/<name>` in the "receiving run folder"; RF-7 (approved later) says `received_files/<sender run ID>/<name>` in the agent's own folder. The investigation notes' supplement inventory says "Ready for Approval" |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Feature + rule change | — |
| Root-cause classification is explicit and evidence-backed | Pass | New capability; existing owners healthy | — |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | No, beyond the two refusals and CM-11 | — |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | The reason not to share a core with Memory Sync is recorded (P11 "Where it bends") and holds | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | One Owner Per Node, In Call Order? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Delegation with files | Pass | Pass | Pass | Pass | Pass | Pass | Pass (upload before `startDelegatedRun`; `OutgoingFiles` called by `toPeerRun`, no callback) |
| DS-002 | Message with files | Pass | Pass | Pass | Pass | Fail | Pass | Fail (AR-002: on B, `placeFor` comes before the engine's accept checks, which can still refuse) |
| DS-003 | Inbound transfer | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-004 | Sweep | Pass | Pass | N/A | Pass | Fail | Pass | Fail (AR-003: removes a completed file whose delivery is still uploading its siblings) |
| DS-005 | RF-14 | Pass | Pass | N/A | Pass | Fail | Pass | Fail (AR-005: `NODE_MISMATCH` only for a sender whose root links the run) |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `OutgoingFiles` | Pass | Pass | Pass | Pass | One owner for both tools |
| `ReceivedFiles` | Pass | Pass | Pass | Pass | Routes and roots call it; confined paths |
| Roots' accept steps | Pass | Pass | Fail | Fail | AR-002: placement happens outside the engine's commit, so a refusal after it leaves visible changes |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `OutgoingFiles` ← workspace manager, run manager, channel | Pass | Pass | Pass | Pass | Composition |
| `ReceivedFiles` ← data folder, layout; `remote-collaboration/inbound` ← roots | Pass | Pass | Pass | Pass | — |

Composition root / Principle 16: `Pass` (§ Principles: built in the composition with their collaborators).

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `POST /rest/remote/received-files/status`, `PUT …/:sha256?offset&size` | Pass | Pass | Pass | Low | Pass |
| `files: FileDescriptor[]` on four existing requests | Pass | Pass | Pass | Low | Pass |
| `OutgoingFiles.send`, `ReceivedFiles.placeFor` | Pass | Pass | Pass | Low | Pass |
| `files_sent` on tool results; `AUTOBYTEUS_RECEIVED_FILE_MAX_MB` | Pass | Pass | Pass | Low | Pass |

Empty indirection check: `Pass`.

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Piece protocol, verify, place by rename | Pass | Pass | Pass | Pass | Memory Sync pattern; `hashFile` reused; separate owner justified |
| Raw-body signing | Pass | Pass | N/A | Pass | G-2 |
| Agent-folder consumers (Memory Sync scan, package validator) | Fail | Fail | N/A | Fail | AR-001: the Memory Sync scanner is not considered. The package validator checks required and retired files only, so it is unaffected |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-collaboration/execution/remote/outgoing-files.ts` | Pass | Pass | Pass | Pass | — |
| `remote-collaboration/inbound/received-files.ts` | Pass | Pass | Pass | Pass | — |
| Router / `RemoteMessageSend` / roots (RF-14) | Pass | Pass | Fail | Fail | AR-004, AR-005 |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Validate → hash → status → upload (both tools) | Pass | Pass | Pass | Pass | `OutgoingFiles` |
| Staging with Memory Sync | Pass | N/A | Pass | Pass | Deliberately not shared, with a reason that holds |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `FileDescriptor {sha256, size, name}` | Pass | Pass | Pass | N/A | Pass | — |
| Message line `referenceFiles` (now set on remote lines) | Pass | Pass | Pass | N/A | Pass | The sender's paths on A and the received paths on B (CM-9) |

Derived consumers of a changed structure: `Fail` (AR-001: agent folders gain `received_files/`, and Memory Sync, which walks every regular file in them, is not listed). Vocabulary: `Pass` (`received_files` at two levels with one meaning; RFC § 1).

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Re-Tightened After Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `outgoing-files.ts`, `received-files.ts` (new) | Pass | Pass | N/A | Pass | — |
| Changed files | Pass | Pass | N/A | Pass | Named per owner in the Ownership Map and the sequence. Implementation lists them in its handoff |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `<data>/received_files/` (node level) | Pass | Pass | Low | Pass | The founder's placement; one disk with `memory/` (`app-config.ts:333-335`) |
| `memory/…/<agent>/received_files/<sender run ID>/<name>` | Pass | Pass | Low | Pass | AR-001 concerns who else reads it |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Two attachment refusals; forced `[]` on remote lines; `ATTACHMENTS_NOT_SUPPORTED` | Pass | Pass | Pass | Pass | — |
| Linked routing without `node` | Pass | Pass | Fail | Fail | AR-004: once each root's `deliverExact` remote branch refuses `NODE_REQUIRED`, `RemoteMessageSend.send` (and `RemoteMessageSendInput`) has no caller (callers today: `standalone-root-message-delivery.ts:117`, `team-run-message-delivery.ts:73`, `agent-org-run-message-delivery.ts:68`). It is not named for removal |
| The 492 "also pass node" hint where the node is known | Pass | Pass | Pass | Pass | — |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| CM-11 routing | No | Pass | Pass | Rejected in the log (DEC-006) |
| Peer versions | No | Pass | Pass | Rule 9 |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Evidence Is Sufficient? | Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `<data>/received_files/`, per-agent `received_files/` | `Not Affected` (new data only) | Pass | Pass | N/A | Pass | — |
| Remote message lines with `referenceFiles` | Directly usable | Pass | Pass | N/A | Pass | The field exists and is validated today |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Seven steps (store and routes first, then senders, then RF-14, then cleanup and timeouts, then docs and E2E) | Pass | Pass | Fail (AR-004) | Fail |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Entry forms (8 rows) | Yes | Fail | N/A | Fail | Form 6 (`NODE_MISMATCH`) covers only a linked run of the sender's root (AR-005) |
| RFC examples (delegate, reply) | Yes | Pass | N/A | Pass | — |

## Material Premise Validation (Only When Needed)

### `MP-001` — A received file reaches the memory hub

- Related approved requirement or contract: Problem ("Nothing is shared implicitly"), RFC-001 Purpose ("There is no hidden sharing"), RF-10 (a received file belongs to the receiving run), RF-12.
- Initiating basis kind: `Operational` / `User`.
- Trigger: the owner has Memory Sync configured (an existing, user-configured feature), and an agent on this node receives a file from another node (UC-001/002).
- Forward path:
  1. `ReceivedFiles.placeFor` creates `memory/agents/<run>/received_files/<sender>/<name>`, a hard link, i.e. a regular file.
  2. On the next Memory Sync export, `LocalMemoryExportScanner.walkRoot` lists every regular file under `memory/agents` and `memory/agent_teams` (`local-memory-export-scanner.ts:25-79`), excluding only `.tmp`, `.partial`, `.lock`, `.swp`, `.swx` and `.DS_Store` (`memory-sync-path-policy.ts:7, 71-80`).
  3. Files larger than 8 MiB are staged to the hub (`memory-sync-transfer-limits.ts:9-15`).
- Consequence: every received file (up to 2 GiB each) is copied to the memory hub, another machine, as a full copy (the hub has no hard links). That is a second, unstated data flow off the node, plus the bandwidth and storage it takes. The founder decided where received files live, but not whether Memory Sync carries them.
- Reachability: `Reachable`.
- Review consequence: AR-001.

### `MP-002` — Same-sender replacement before a refusal

- Related approved requirement: RF-5 / REQ-006 (nothing delivered when the message is not), RF-7.
- Trigger, in order:
  1. B's PM delegated a Task to node C, and later closed it (supported).
  2. C's task agent then sends its final deliverable to B's PM with `send_message_to(node: "B", …, reference_files: ["…/report.pdf"])`. It sent an earlier `report.pdf` before the closure (supported).
- Forward path (design):
  1. On B, the root's `acceptRemoteMessage` calls `ReceivedFiles.placeFor`, which renames the new bytes over `received_files/<C's run>/report.pdf`.
  2. The engine's `acceptFromRemote` then runs `assertDeliveryAllowed`, whose closed-Task check for the sender's `delegated_run` endpoint (`standalone-agent-run-root.ts:131, 294-301`) refuses `TASK_AGENT_RESOURCE_CLOSED`.
- Consequence: the message is refused, but B's PM's earlier `report.pdf` now holds the new bytes, so every older message that named it opens content the PM never received. Other refusals after placement (the root closing, the receiver not current, a duplicate message ID) do the same, and the work-packet path does it when `readyHost` fails after placement.
- Reachability: `Reachable`.
- Review consequence: AR-002.

### `MP-003` — The sweep removes a completed file whose message is still uploading its other files

- Related approved requirement: RF-5, RF-11, REQ-006, REQ-007; AC-001 (a delegation with three files).
- Trigger: an agent on A sends a call with several large files to B (within 4 GiB, up to ~27 minutes at 20 Mbit/s, design § Ownership). Meanwhile the user deletes any run's history on B in the app (a supported, routine action), or a dedup-skipped file (RF-11) waits while new files upload.
- Forward path: file 1 completes (rename `.partial` → `<sha256>`; `nlink` = 1). A history delete commits on B and `ReceivedFiles.sweep()` runs. `stat(<sha256>).nlink === 1`, so it is removed. The other files finish; the message arrives; `placeFor` finds file 1 missing and answers `REFERENCE_FILE_CHECK_FAILED`.
- Consequence: a long call fails although every byte arrived, and the retry uploads file 1 again. It is not corruption (all or nothing holds), but it is a spurious failure of the success case on a routine action.
- Reachability: `Reachable` (two independent actors on B: an autonomous sender on A and the user on B; neither needs to know about the other).
- Review consequence: AR-003.

## Unresolved Approved-Behavior Or Current-State Gaps

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Do received files go to the memory hub? | A data flow off the node that nobody decided | AR-001 | Open |
| AC-009's evidence decision | AC-009 asks for the runtimes' limits to be measured in design, or an evidence decision recorded before approval; the design sets values from documentation and defers AGY/Grok/ACP | AR-006 | Open |

## Review Decision

`Fail`.

## Findings

### AR-001 — Memory Sync would copy every received file to the memory hub; the design does not list it

- Type: `Requirement Gap` (the decision) with a `Design Impact` part (the unlisted consumer); severity: High.
- Protects: Problem/RFC-001 Purpose ("nothing is shared implicitly"), RF-10, RF-12; Principle 11 (derived consumers).
- Scope status: `Requirement Gap — User Approval Required` (sync or exclude is the founder's call).
- Problem: MP-001. Received files live in agent folders by the founder's own decision; Memory Sync exports every regular file there. The design says "Left alone: Memory Sync".
- Evidence: `local-memory-export-scanner.ts:25-79`; `memory-sync-path-policy.ts:7, 71-80`.
- Required update:
  - List the agent-folder consumers in Change Scope (Memory Sync export scanner; the package validator, which is unaffected).
  - Put the question to the founder. Options: (a) Memory Sync skips `received_files/`, a one-line path policy and the hub keeps memory only; (b) it syncs them, with the cost stated.
  - The design follows his answer.
- Recipient: Solution Designer.

### AR-002 — On the receiving node, placement happens before the checks that can still refuse the message

- Type: `Design Impact`; severity: Medium.
- Protects: RF-5 / REQ-006 (nothing delivered), RF-7 (replacement belongs to a delivered message).
- Scope status: `Within Approved Scope`. Changes approved behavior: No.
- Problem: MP-002. The Ownership Map has the roots call `placeFor` (which replaces same-named files at once), then the engine accepts. The engine's refusals after that (closed Task, root closing, receiver not current, duplicate ID; `readyHost` for a work packet) leave a replaced file and no message. RFC § 6 says placement is "in the same step that writes its log line", but the design orders it before.
- Required update: name the order on DS-001/DS-002, with one owner driving it. Possible shapes:
  - (a) Verify that every named file is complete, then run the engine's admission checks, then place (atomic renames), then the durable log line, then the input. Placement then sits at the engine's commit point, as a step the root drives, not a callback the engine runs (Case 1).
  - (b) Stage every placement under temporary names before the accept, and rename over the final names only once the engine has committed; on refusal remove the temporary names.
  - Either way, add MP-002 as a test.
- Recipient: Solution Designer.

### AR-003 — The sweep can remove a completed file whose delivery is still uploading

- Type: `Design Impact`; severity: Medium.
- Protects: RF-5 / RF-11 / REQ-006 / REQ-007; AC-001, AC-007.
- Scope status: `Within Approved Scope`. Changes approved behavior: No (RF-10 says "removed when no agent folder links to it", not "at once").
- Problem: MP-003. Any completed `<sha256>` with no agent link is removed at the next sweep, including one waiting for its message.
- Required update: the sweep removes an unlinked completed entry only when it has been unlinked longer than a grace period, for example its last modification older than the same 24 h as `.partial`s. Have `status` answering "complete" touch the entry, so a dedup skip (RF-11) also counts as a use. State it in DS-004 and test it.
- Recipient: Solution Designer.

### AR-004 — `RemoteMessageSend.send` becomes dead under RF-14 but is not in the removal plan

- Type: `Design Impact`; severity: Low.
- Protects: Principles 7 and 8.
- Problem: today the root's `deliverExact` remote branch (`standalone-root-message-delivery.ts:109-117`, and the Team and Org equivalents) is the only caller of `RemoteMessageSend.send`. Under RF-14 that branch refuses `NODE_REQUIRED`, so `send`, `RemoteMessageSendInput` and the roots' remote branch beyond the refusal have no caller. The removal plan names "linked routing without `node`" but not these.
- Required update: name them in the removal plan, with the evidence that nothing else reaches them.
- Recipient: Solution Designer.

### AR-005 — `NODE_MISMATCH` covers only a sender whose own root links the run

- Type: `Design Impact`; severity: Low.
- Protects: RF-14 ("a `node` that is not where the run is gets refused with the right node"), REQ-009, AC-010.
- Problem: DS-005 refuses `NODE_MISMATCH` in `sendToPeerRun` only when the sender's root links the target. A sender in another root of the node that holds the Task (the node's tree knows the run's node from its Task entry, as `closedPeerRunRefusal` already reads it) and passes the wrong `node` gets the peer's "not running" instead of the right node.
- Required update: on the `node` path, the same owner that answers `closedPeerRunRefusal` (`CrossRunMessageDelivery`, from the tree's Task entry) also answers `NODE_MISMATCH` with the node it knows. Add a row to the entry-form table.
- Recipient: Solution Designer.

### AR-006 — Stale requirement text; AC-009's evidence decision is missing

- Type: `Requirement Gap` (text) and `Design Impact` (evidence plan); severity: Low.
- Protects: AC-009, DEC-005, RFC-001 RF-7.
- Problem:
  - `requirements-doc.md` DEC-005 still gives the SR-001 location (`<receiving run folder>/received_files/<first 12 hex>/<name>`), contradicting the approved RF-7. The investigation notes' supplement inventory lists RFC-001 as "Ready for Approval".
  - AC-009 asks for each configured runtime's limit to be measured in design with a slow stub tool, or an evidence decision recorded before approval. The design sets Codex `tool_timeout_sec: 3600` and Claude `timeout: 3_600_000` from documentation, defers AGY/Grok/ACP to implementation, and records no evidence decision.
- Required update: correct DEC-005 to RF-7 and the inventory status, and record AC-009's evidence decision. For example: a slow stub tool on the AutoByteus runtime in tests; Codex and Claude verified by configuration reading plus a manual run on the founder's machine; AGY/Grok/ACP measured and recorded as limits.
- Recipient: Solution Designer.

## Classification

`Design Impact` (AR-002, AR-003, AR-004, AR-005, part of AR-001 and AR-006) and `Requirement Gap` (AR-001 decision, AR-006 text). Route: Solution Designer.

## Recommended Recipient

Solution Designer.

## Residual Risks

- Reading the file: `OutgoingFiles` should open the resolved real path once and hash and upload from that descriptor (or re-check that it is the same inode), so a path swapped after validation cannot send a file outside the workspace. The receiver's SHA-256 check covers changed content, not a changed path.
- Concurrent uploads of the same content to one node (two calls at once): define what `appendPiece` does on an offset mismatch, for example answer the current `receivedBytes` so the sender resumes, so the second sender does not fail.
- Completed files from deliveries that were refused stay until the next sweep trigger (startup or a history delete). Acceptable under RF-10 once AR-003's grace period is defined.
- The copy fallback (no hard link) keeps one copy per agent and loses deduplication on that node; this is stated in RF-7.
- Runtimes without a configurable tool limit (AGY, Grok, ACP) may cut long transfers; the call then fails cleanly (all or nothing).

## Latest Authoritative Result

- Review Decision: `Fail`
- Material-Premise Gate: `Pass`. MP-001, MP-002 and MP-003 are reachable, each with a forward witness.
- Notes: The core shape is sound: `OutgoingFiles` as one owner for both tools, bounded signed pieces that keep NA-9, a content-addressed store with read-only hard links, upload before start, RF-14 owners as the code routes, and workspace containment that holds for every sender kind. The findings are the Memory Sync data flow (a decision for the founder), the receiving node's placement order, the sweep's window, two RF-14 cleanups, and stale requirement text plus AC-009's evidence.
