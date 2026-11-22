# Design Review Report — cross-node-file-transfer-587 (autobyteus-587)

## Review Round Meta

- Upstream Requirements Doc: `tickets/in-progress/cross-node-file-transfer-587/requirements-doc.md` (Approved; status SR-010: DEC-009, AC-012, AC-002/AC-007 wording)
- Upstream Investigation Notes: `tickets/in-progress/cross-node-file-transfer-587/investigation-notes.md`
- Upstream Solution Revision Record: `tickets/in-progress/cross-node-file-transfer-587/solution-revision-record.md` (SR-001 … SR-010)
- Reviewed Design Spec: `tickets/in-progress/cross-node-file-transfer-587/design-spec.md` (Ready, SR-010; § Revision SR-010 governs)
- Supplemental Task Artifacts Reviewed: `reference-files-contract.md` (RFC-001, Approved, behavior-defining); `handoff-architecture-review.md`; `follow-ups.md` (none)
- Relevant Solution Revision IDs: SR-001 … SR-010
- Architecture Review Revision Record: `tickets/in-progress/cross-node-file-transfer-587/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-003`
- Current Review Round: 3
- Trigger: SR-010 (commit `beb161d299`): the Solution Designer's revision after code review CRR-008 (CR-587-01 Design Impact, CR-587-02 … 05, FU-007) and the autobyteus-591 merge (IR-004). Round 2 reviewed SR-008 (`eac8cf3814`).
- Prior Review Round Reviewed: 2 (ARCH-REV-002, `Pass`, on SR-008); round 1 (ARCH-REV-001, `Fail`)
- Latest Authoritative Round: 3
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

## SR-010 Delta Review (Round 3)

Code read at `beb161d299`, the merged implementation at IR-004: `global-agent-run-message-router.ts:85-130`, `cross-run-message-delivery.ts:51, 165-216`, `remote-message-send.ts:25-50`, `task-delegation.ts:132-173, 380-445`, `task-execution-input.ts:17-29`, `project-task-tool-contract.ts:19-21, 59-68`, `context-file-upload-policy.ts:5-39`, `agent-team-collaboration-llm-contract.ts:55-75`.

| Item | Claim | Evidence | Verdict |
| --- | --- | --- | --- |
| R1 order (CR-587-01) | The router's `node` step owns one order: peer → `PeerRunNodes.check` (reads only) → `OutgoingFiles.send` (all local checks, then the whole upload) → `admitPeerRun` (may reopen and notify the peer) → `deliverToPeerRun` with descriptors → after a reopen, a refusal gets "its Task is open again" | Today the router runs `admitPeerRun` (`:100`) before the path, and `RemoteMessageSend.sendToPeerRun` uploads (`remote-message-send.ts:50`), so a file refusal can follow a reopen (CR-587-01 confirmed). In R1 nothing changes Task state before every file is on the other node. `notDeliveredAfterReopen` exists (`cross-run-message-delivery.ts:51`) for the wording. The founder confirmed the order | Pass. One driver (the router); `RemoteMessageSend` loses `outgoing` and its upload; `OutgoingFiles` has two callers (router, `TaskDelegation`), one owner of the upload |
| R2 `PeerRunNodes` (one owner of RF-14) | Reads the sender root's links (including a peer-started run's back-link) through the root boundary, then the tree's Task entries; refuses `NODE_REQUIRED` / `NODE_MISMATCH` / `NODE_NOT_PAIRED`; the router calls it once before any path | Replaces `peerRunNodeRefusal` (`:173`), the roots' `deliverExact` remote branches, `sendToPeerRun`'s check and `route`'s RF-14 part, four places today | Pass. One owner for a rule that was in four places (Principle 13). `NODE_NOT_PAIRED` closes CR-587-03 without a raw node ID |
| R3 saved Task files (DEC-009, founder) | 4b: `task_id` + `node` (new copy): files through `OutgoingFiles` before `startDelegatedRun`. 4c: existing remote copy: files before `assignExistingTaskExecution`. RF-3 exception for the Task's resolved context files | The existing-copy path is one sequence owned by `TaskDelegation` (`task-delegation.ts:380-445`: resolve → checks → assign → notice → deliver), so the upload slots in before the assignment without a callback. The exception is the founder's decision, with the same "visible step" model as DEC-001 (see Residual Risks) | Pass. AR-008 (non-blocking): RF-14's "for both tools" against row 4c |
| R4 local fixes | CR-587-02 wording; CR-587-04 one open with matching `dev`/`ino`; CR-587-05 model fields | Within the approved contracts; the gate's codes are unchanged (NA-9) | Pass |
| R5 tests | R1 order (refused file after an assigner continuation: nothing reopened; refusal after a reopen: wording), `PeerRunNodes` (each refusal, linking and non-linking root, removed peer), AC-012, the three fixes | — | Pass |
| Classification | `Large` / `High` | Unchanged surfaces plus Task-state ordering | Pass |

## Unresolved Approved-Behavior Or Current-State Gaps

None blocking. AR-008 is a wording scope of RF-14 (below).

## Review Decision

`Pass` (round 3). The upstream behavior basis (DEC-009, AC-012) is confirmed, the SR-010 revision is ready for implementation, and no in-scope machinery or finding depends on an unsupported material premise.

## Findings

No blocking finding. AR-001 … AR-006 stay resolved.

### AR-007 — Spine lines still show the old order (non-blocking, carried)

- Status: Open, non-blocking, carried from ARCH-REV-002.
- DS-001, DS-002 and DS-005 still show the SR-007/008 shapes: placement before the engine, the upload inside `RemoteMessageSend`, and the RF-14 refusals in the roots and CrossRun.
- § Revision SR-010 R1 and R2 and § Ownership Map "Order on the receiving node" govern, as the design states. Redraw the spine lines at the next revision.

### AR-008 — RF-14 says "for both tools"; row 4c gives a remote copy work without `node` (non-blocking)

- Type: `Requirement Gap` (contract wording); severity: Low; blocking: No.
- Protects: RFC-001 RF-14 and route row 4c; AC-010, AC-012.
- Problem:
  - RF-14 reads "every call whose recipient is on another node names it with `node`, for both tools".
  - Row 4c (`delegate_task` with `task_id` and a target run ID of a copy on another node, added at SR-010) names no `node`, and `delegate_task` accepts `node` only with `recipient_address` (`agent-team-collaboration-llm-contract.ts`, `DELEGATE_TASK_NODE_DESCRIPTION`).
  - `PeerRunNodes` is called by the router only, so 4c never reaches it.
  - Row 4c matches the 591 behavior already merged: the node comes from the run's Task entry.
- Why not blocking: row 4c is the more specific, founder-approved form, it is today's shipped 591 behavior, and nothing in it hides the node (the Task entry holds it). Build 4c as the row reads.
- Required update: at the next revision, scope RF-14's sentence: either "for `send_message_to`, and `delegate_task` to a new copy; a Task given to an existing copy goes to the node its Task entry names", or, if the founder wants `node` there too, a new decision.
- Recipient: Solution Designer.

## Classification

N/A (Pass). AR-007 and AR-008 are non-blocking.

## Recommended Recipient

Implementation engineer (primary). Solution Designer (informational, with AR-007 and AR-008).

## Residual Risks

- **Upload before a predictable CLOSED refusal.** With R1, a sender that is not the assigner, messaging a peer run whose Tasks this node holds closed, uploads every file before `admitPeerRun` refuses CLOSED. Up to 4 GiB is wasted, and the bytes are swept after 24 h. Correctness holds. A read-only preview of the admission before the upload would avoid the waste, but it would split 591's owner; this is a suggestion, not a finding.
- **Existing-copy path (R3).** Put the upload after the path's read-only checks (`assertAssignable`, the conversation check) and immediately before `assignExistingTaskExecution`, so a refusal costs no upload.
- **RF-3 exception (DEC-009).** An agent can attach a file of any app-accepted type to a Task itself (`create_task` / `update_task` `context_files`, "absolute local file paths on this node … copied into the new Task"; types in `context-file-upload-policy.ts:5-39`, e.g. `.json`, `.pdf`, images, video). With the exception, that file can then go to another node. This is the same visible-step model as DEC-001 (an agent may copy a file into its workspace and send it). It is recorded here for the founder's awareness, not as a new threat model.
- A log-append I/O failure after placement leaves a placed file without its message (unchanged).
- AGY/Grok/ACP tool-call limits accepted unverified (DEC-008, FU-001).
- Two-node behavior stays unverified until the two-server E2E runs (AC-001 … AC-007, AC-010, AC-012).

## Latest Authoritative Result

- Review Decision: `Pass` (ARCH-REV-003)
- Material-Premise Gate: `Pass`. CR-587-01's premise (an assigner continues a closed peer run with a file from outside its workspace) is reachable and handled by R1.
- Notes: `task_size=Large`, `architectural_risk=High`. SR-010 at `beb161d299` is ready for implementation. § Revision SR-010 governs.

## SR-011 Delta Review (Round 4)

- Trigger: SR-011 (commit `74abb1a886`), the Solution Designer's answer to AR-008 and AR-007.
- AR-008: resolved. The Solution Designer applies the founder's RF-14 as stated, with no exception: row 4c takes `node`. `delegate_task` accepts `node` with `target_agent_run_id`/`target_team_run_id` + `task_id`. `TaskDelegation`'s existing-copy path calls `PeerRunNodes.check(sender, the copy's entry agent, node)` before anything else, so no Task-side change or upload precedes the node check. A local copy given `node` gets `NODE_MISMATCH` naming this node. `PeerRunNodes` stays the one read-only owner of RF-14, with two callers (the router and this path). RF-14, row 4c, AC-012 and DEC-006 are consistent. No new behavior beyond the founder's approved rule.
- AR-007: resolved. DS-001 notes R3, DS-002 is redrawn in the R1 order with the AR-002 receiving order, and DS-005 names `PeerRunNodes` and its two callers.
- Consequence for implementation: the existing-copy form without `node`, which 591 shipped, now refuses `NODE_REQUIRED`. 591's tests and fixtures for that form change with it (DESIGN.md rule 11).
- Round 4 decision: `Pass` (ARCH-REV-004). No open findings.
