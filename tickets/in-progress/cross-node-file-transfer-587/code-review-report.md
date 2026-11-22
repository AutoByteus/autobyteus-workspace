# Code Review Report — cross-node-file-transfer-587 (autobyteus-587)

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (Approved, SR-008; REQ-001 … REQ-009, AC-001 … AC-011, DEC-001 … DEC-008)
- Investigation Notes Reviewed As Context: cited sections only
- Solution Revision Record Reviewed As Context: `solution-revision-record.md`
- Design Spec Reviewed As Context: `design-spec.md` (SR-009)
- Supplemental Task Artifacts Reviewed As Context: `reference-files-contract.md` (RFC-001, approved by the founder)
- Relevant Solution Revision IDs: SR-005 … SR-009
- Design Review Report Reviewed As Context: `design-review-report.md` (worktree copy, with the reviewer's uncommitted round-2 edits)
- Architecture Review Revision Record Reviewed As Context: worktree copy
- Relevant Architecture Review Revision IDs: ARCH-REV-001, ARCH-REV-002
- Implementation Handoff Reviewed As Context: `implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001 … IR-006
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-010`
- Current Review Round: `6`
- Review Scope: `Targeted Delta Review`
- Review Scope Evidence (round 2): `ef53fadd52..e295b74b81` changes six test files only. Delivery's merge `3be417f8df` brought six `src` files from `origin/personal`; none is a file this ticket changed (the two change sets do not intersect). No production source of this ticket changed since `e327ba2467`, so round 1's structural checks and scores carry forward
- Trigger: IR-002 (delivery's DEL-03 Local Fix, items 1–3 in `release-deployment-report.md` § Escalation / Reroute): test fix `e295b74b81`, handoff and evidence `20866c8847`, on delivery's `ef53fadd52`. Round 1: IR-001, code `e327ba2467`, base `fbe714f8bb`
- Prior Review Round Reviewed: 1 (CRR-001); Latest Authoritative Round: 2
- Failure-origin fields: N/A

## Routing Classification Review

- Task size `Large`, architectural risk `High`, route `Implementation Review`; independent source review required: `Yes`.
- Classification confirmed: a new inter-node contract (two routes, raw-body signing, `files` on two requests), new persisted data, a security boundary (files leaving a machine), a changed message rule (RF-14) and deletion semantics.

## Review Scope

- Read in full:
  - `outgoing-files.ts`, `transferred-files.ts`, `received-files.ts`, `remote-files-composition.ts`, `received-file-size-limit-setting.ts`.
- Read as diffs against base `fbe714f8bb`:
  - the REST piece scope, `peer-gateway.ts`, `peer-client.ts`, the signature, `remote-message-receiver.ts`, `remote-requests.ts`;
  - the engine and its port, `remote-message-send.ts`, the three roots' deliveries;
  - `cross-run-message-delivery.ts`, the router, `task-delegation.ts`, `remote-delegation.ts`;
  - the runtime builder, tool contracts and wording, the Codex and Claude materializers, `delegated-work-guard.ts`, the Memory Sync path policy, the startup wiring, docs.
- Checked against existing code:
  - the node-access gate's raw-stream body hash (`node-access-plugin.ts:69-92`), which hashes the bytes as they arrive for any content type, so the octet-stream piece is covered by NA-9;
  - `routeAccessFor` (`/rest/remote` is peer-only for every method);
  - the only caller of `deliverExactAgentMessage` (the router);
  - the `send_message_to` result whitelist.
- Exclusions: test bodies beyond their case lists; generated and baseline files; two-server E2E (API/E2E's).
- Checks: I reran none. IMP-01 … IMP-05 ran on `e327ba2467` (IMP-02 and IMP-03 on its content), and no code changed after them.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved basis understood: Yes:
  - RFC-001 RF-1 … RF-14;
  - workspace-only files (DEC-001), the per-file setting and 4 GiB per call (DEC-002), the call waits (DEC-003);
  - one copy per content and a sweep (DEC-004), RF-14 node always named (DEC-006), Memory Sync skips received files (DEC-007);
  - evidence for AC-009 (DEC-008).
- Design behavior map verified against the implementation: Yes (DS-001 … DS-005; entry forms 1–8).
- Design review: ARCH-REV-002 Pass. Its residuals (the realpath-then-open window, offset resume and the 24 h touch) are implemented as the design states.
- Behavior-basis status: `Confirmed`. Changed or newly discovered behavior: None; the new refusal is judged at C-05. Remaining ambiguity: AC-002 says "no `node`", against REQ-009/RF-14 (a wording item for the Solution Designer, C-10).

| Behavior / Contract | Status | Implementation Path And Lifecycle Evidence |
| --- | --- | --- |
| BEH-001 / DS-001 / route 4 | Confirmed | `TaskDelegation.toPeerRun` → `OutgoingFiles.send` before `startDelegatedRun`; the work packet carries `files`. On B: `RemoteMessageReceiver` verifies, then the root's `acceptRemoteWorkPacket` checks the link, readies the host, places, and posts with `files.paths` (standalone; Team in the coordinator's folder) |
| BEH-002 / DS-002 / routes 5–6 | Confirmed | `RemoteMessageSend.sendToPeerRun`: link/node check → `OutgoingFiles.send` → `prepareRemoteSend` (the sender's line keeps its paths) → `deliver(…, files)` → `commitSentToRemote`. On B: verify → engine `acceptFromRemote` (open → current receiver → Task scope → content → plan → reserve → place → commit; a failed or throwing placement cancels the reservation) |
| BEH-003 / RF-8, RF-9 | Confirmed | The remote input builder lists "Reference files:" with the received paths; each line records its own node's paths |
| DS-003 / REQ-002, 005 | Confirmed | Signed status and raw `PUT` pieces. The route's own scope has the octet-stream parser and an 8 MiB body limit; the gateway re-checks 8 MiB and parses the hash, offset and size from the signed query. `appendPiece` checks the claimed size against the limit and `offset + bytes ≤ size`, appends only at the bytes held, and checks size and SHA-256 at completion |
| REQ-004 / RF-3 | Confirmed | `fs.realpath` of the file and of the workspace, containment, `open` at the resolved path, `isFile()` on the open handle; hash and pieces read from that handle |
| DS-004 / RF-10 | Confirmed | `sweep()`: entries with `nlink === 1` untouched for 24 h, and `.partial` files untouched for 24 h, under each content's lock. It runs at startup and after a committed history delete (`DelegatedWorkGuard`) |
| RF-12 | Confirmed | Pieces only into `<data>/received_files/<sha256>` (64 lowercase hex). Placement only inside `<data>/memory` (`inside`), under cleaned peer-given names (`safeReceivedFileName` for the sender run ID and the file name) |
| DS-005 / RF-14 | Confirmed | No `node` to a linked endpoint gets the roots' `deliverExact` → `NODE_REQUIRED`. A run the tree holds goes through `peerRunAdmission`: `NODE_MISMATCH` with the right node, `TASK_AGENT_RESOURCE_CLOSED`, or `NODE_REQUIRED`. A wrong `node` for a run the sender's root links gets `sendToPeerRun` → `NODE_MISMATCH` |
| AC-011 / DEC-007 | Confirmed | The Memory Sync path policy leaves out any entry named `received_files` (folders included) |
| AC-009 / DEC-003, 008 | Confirmed | Codex `tool_timeout_sec: 3600`; Claude `timeout: 3_600_000`; AGY/Grok/ACP in FU-001 |
| AC-008 / RF-1 | Confirmed | Same-node paths untouched |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related | Kind | Actor | Goal | Entry | Shape | Path | Outcome | Evidence | Validity | Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| UC-001 | BEH-001; AC-001 | User/Contract | Agent on A | Delegate with files | `delegate_task(node, reference_files)` | Normal | DS-001 | Received paths in B's packet | Founder's example; RFC-001 | Supported Normal | Use |
| UC-002/003 | BEH-002; AC-002 | Contract | Agent on A or B | Message or return deliverables with files | `send_message_to(node, …)` | Normal | DS-002 | Received paths; both logs | RFC-001 routes 5–6 | Supported Normal | Use |
| UC-004 | REQ-007; AC-007 | System | Node | One copy per content; cleanup | re-send, history delete, startup | Normal | DS-003/004 | Skip upload; sweep | DEC-004 | Supported Normal | Use |
| SEC-1 | REQ-004; AC-004 | Security contract | Misled agent | Send a file outside its workspace | `reference_files` | Explicit Edge | RF-3 | Refused before sending | DEC-001 | Supported Explicit Edge | Use |
| SEC-2 | RF-12; AC-003, 005 | Security contract | Paired peer | Tampered, oversize or misnamed upload | peer routes | Explicit Edge | DS-003 | Refused; nothing placed outside the store/agent folder | NA-9, RF-12 | Supported Explicit Edge | Use |
| RF-14 | REQ-009; AC-010 | Contract | Any agent | Message a remote run without / with the wrong node | `send_message_to` | Normal | DS-005 | `NODE_REQUIRED` / `NODE_MISMATCH` | DEC-006 | Supported Normal | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract | Trigger | Path / Consequence | Evidence | Disposition | Reason / Response |
| --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | RF-3 resolves the path, then opens the resolved path again (a second lookup). A component swapped to a symlink in between could send a file outside the workspace | SEC-1 | Requires a concurrent symlink swap timed against the call | The design records this as a residual (single open, "no second path lookup; residual") | `outgoing-files.ts:126-141` | Reject (timing race, not a supported scenario; P6). Noted in Residual Risks | — |
| C-02 | Peer-given `sender.agentRunId` and file `name` decide the placement path | SEC-2, RF-12 | A paired peer sends crafted names (`../x`, `a/b`, control characters) | `safeReceivedFileName` keeps the last segment, strips control characters, maps `.`, `..` and empty to `file`; `inside()` then refuses any target outside the folder; the agent folder must lie inside `<data>/memory` | `received-files.ts:32-45, 136-152`; unit case "only into an agent folder inside the node's memory, with safe names" | Reject (handled) | — |
| C-03 | A malicious paired peer could claim another sender's run ID and replace that sender's same-named file, or ask whether this node holds a content by SHA-256 | RF-12, RF-11 | Requires a hostile *paired* peer that knows the other run's ID or the file's hash | Pairing is the trust boundary the founder accepted (492 DEC-002); the status answer is the approved dedup design (RF-11) | RFC-001 RF-11/RF-12 | Reject (outside the threat model the requirements approve) | Noted in Residual Risks |
| C-04 | Upload runs before `prepareRemoteSend`'s and the peer's admission checks (empty content, a refused delegation target), so a refused call may have uploaded first | RF-5, DS-001/002 | An agent sends an empty message with files, or delegates to a target B refuses | Nothing is delivered (all or nothing holds); the bytes are an unlinked entry, swept after 24 h. This is the design's chosen order (DS-001/002) | `remote-message-send.ts`, `task-delegation.ts` | Reject (design order; no requirement broken) | Noted in Residual Risks |
| C-05 | New refusal `REFERENCE_FILE_NAME_REPEATED` (D-5) | RF-5, RF-7 | Two files with one name in a call | They would land at one path (RF-7), so one would replace the other and the call could not deliver every file (RF-5). Refusing names the problem before sending; documented in `remote_collaboration.md` | `outgoing-files.ts:88-89` | Reject (follows RF-5/RF-7) | The Solution Designer may add it to RFC-001 § 5 (C-10) |
| C-06 | Process lookup `AgentRunManager.getInstance()` in `composeRemoteFiles` (Principle 16) | P16 | — | Read only at send time, after the server listens; a missing manager throws; passing it in would need a cycle between the compositions | `remote-files-composition.ts:27-31` | Reject (reason holds) | — |
| C-07 | D-1 plan/place split; D-2 one sweep trigger in `DelegatedWorkGuard`; D-3 verify once in the receiver; D-4 files on the work packet only; D-6 Team memory locator | Design order (AR-002) | — | Same order as the design: checks → reservation → placement → commit. One trigger covers all three delete owners. Verification runs before any root sees the request. D-6 fixes a fallback the in-process test exposed | diffs | Reject (reasons hold) | — |
| C-08 | A history-delete sweep removes only entries untouched for 24 h, and there is no periodic sweep; a file received within the last day stays on disk after its last run is deleted, until a later sweep | AC-007 ("deleting the second frees the space"), DS-004 | Delete a run that received a file today | Space is freed at the next startup or the next delete after 24 h. The design specifies this rule (AR-003) to protect calls in flight | `received-files.ts:155-172` | Reject (design rule; the AC's timing is satisfied eventually) | API/E2E should assert AC-007 against this rule. Noted for the Solution Designer under Residual Risks |
| C-09 | The 1 h tool-call limit applies to every Agent Tools MCP tool, not only file sends | RF-6, DEC-003 | Any Agent Tools call that hangs | A hung call now waits up to an hour before the runtime cuts it. The design sets it per server, which is the only granularity offered | materializers | Reject (design decision) | Noted in Residual Risks |
| C-10 | AC-002 wording ("linked, no `node`") contradicts REQ-009/RF-14/AC-010 | Requirements consistency | — | The implementation follows RF-14 and the later requirement | handoff | Not a code finding | Wording correction for the Solution Designer |
| C-11 | Malicious or buggy peer answers (`receivedBytes` past the size, or no progress) could make the sender's loop throw or repeat | DS-003 | A peer that answers falsely | A hostile paired peer is out of the threat model (C-03); a normal peer always advances or completes | `outgoing-files.ts:107-120` | Reject (not a supported scenario) | — |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment preserved | Pass | One upload owner for both tools; refusals replaced, not wrapped | — |
| Matches behavior-defining supplement (RFC-001) | Pass | RF-1 … RF-14 traced above | — |
| Data-flow spine inventory | Pass | DS-001 … DS-005 match | — |
| Ownership boundary preservation | Pass | `OutgoingFiles` (sender), `ReceivedFiles` (store, placement, sweep), the engine drives the receive order, roots only resolve folders | — |
| Off-spine concern clarity | Pass | The size setting, the path policy and the timeouts sit with their owners | — |
| Existing capability reuse | Pass | `hashFile`, `withFilePathLock`, the gate's body hash, `PeerClient.call` (raw-body branch) | — |
| Reusable owned structures | Pass | `TransferredFile`, `ReceivedFilesPlan`, `RemoteFiles` in one file | — |
| Shared-structure tightness | Pass | `files` is a separate field; descriptors are three fields | — |
| Repeated coordination ownership | Pass | One sender sequence; RF-14 rule split by who knows the node (design G-3) | — |
| Empty indirection | Pass | `ReceivedFilesPlacement` is a narrowed type that keeps roots off `remote-collaboration` (dependency direction) | — |
| Separation of concerns / file responsibility | Pass | — | — |
| Ownership-driven dependency | Pass | Roots depend on the `agent-collaboration` port, not on `remote-collaboration` | — |
| Visible dependencies (P16) | Pass — deviation recorded, reason holds | C-06 | — |
| Authoritative Boundary Rule | Pass | — | — |
| File placement | Pass | — | — |
| Flat-vs-over-split | Pass | — | — |
| Interface clarity | Pass | Explicit descriptors, results with `files_sent`, the piece's envelope in the signed query | — |
| Naming / one vocabulary | Pass | "received files" at two levels with one meaning (glossary entry added) | — |
| No unjustified duplication | Pass | `referenceFileBlock` shared by both input builders | — |
| Patch-on-patch complexity | Pass | — | — |
| Dead code removed in touched files | Pass | `ATTACHMENTS_NOT_SUPPORTED`, the attachments texts, `RemoteMessageSend.send`/`RemoteMessageSendInput`, `closedPeerRunRefusal` (now `peerRunAdmission`), forced `[]` on remote lines (grep: no readers left) | — |
| Test scenarios requirement-aligned | Pass | Sender, receiver and engine-order unit cases; in-process two-node cases incl. MP-002, AC-010 | — |
| Test fixtures/helpers reusable | Pass | `in-process-peer-files.ts`; `NO_REMOTE_FILES` / `NO_FILES_RECEIVED` | — |
| No stale tests in changed scope | Pass (unit) | Two-server E2E bodies need `files` and `node` (listed for API/E2E) | — |
| API/E2E readiness | Pass | Coverage hints precise; real HTTP and signing still to prove | — |

## Source File Size And Structure Audit

All changed source files stay under 500 non-empty lines; the largest delta is under 50 lines in a tracked file, and new files are ≤ 201 lines.

| Source File | Before | After | `>500` | `>220` Delta |
| --- | --- | --- | --- | --- |
| `remote-collaboration/channel/peer-client.ts` | 429 | 472 | Pass | Pass |
| `agent-team-execution/domain/root-team-run.ts` | 457 | 470 | Pass | Pass |
| `agent-team-execution/services/agent-team-run-manager.ts` | 457 | 466 | Pass | Pass |
| `services/server-settings-service.ts` | 455 | 465 | Pass | Pass |
| New: `received-files.ts`, `outgoing-files.ts`, others | — | ≤ 201 | Pass | Pass |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms | Pass | No version handling (DESIGN.md rule 9); linked routing without `node` removed (DEC-006) |
| No legacy retention | Pass | — |
| Dead code removed in touched files | Pass | — |
| Persisted-data decision followed | Pass | New data only; remote lines use the existing `referenceFiles` field |
| No dual reads/writes | Pass | — |
| Transition mechanics | Pass | N/A |

## Dead / Obsolete / Legacy Items Requiring Removal

None.

## Docs-Impact Verdict

- Docs impact: `Yes`, already done:
  - `collaboration_model.md` (CM-11 rewritten, CM-14);
  - `remote_collaboration.md`, `agent_communication.md`, `agent_tools.md`;
  - `GLOSSARY.md`, web `settings.md`.

## Additional Material Premise Validation

| Premise ID | Current Status | Notes |
| --- | --- | --- |
| Architecture-review premises (MP-002 and others) | Confirmed | MP-002 covered by the engine and in-process tests |

No new premises; C-01, C-03 and C-11 are rejected as outside the supported scenarios.

## Review Scorecard (Mandatory)

- Overall score: 9.4/10 (simple average; not the decision rule)

| Priority | Category | Score | Why | Weak | Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.5 | Each spine has one driver; upload precedes start/prepare; receive order plan → reserve → place → commit | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.5 | Sender and receiver owners; roots reach placement through a port; verification once at the boundary | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.4 | Strict wire readers (status order/length checked); explicit refusal codes; envelope in the signed query | — | — |
| 4 | Separation of Concerns and File Placement | 9.4 | New owners where their subsystems live | — | — |
| 5 | Shared-Structure / Data-Model Tightness | 9.4 | Three-field descriptors; plan type only names and places | — | — |
| 6 | Naming Quality and Local Readability | 9.3 | Clear vocabulary from RFC-001 | Long doc comments | — |
| 7 | API/E2E Readiness | 9.3 | In-process two-node cases with real client, gateway and roots | Real HTTP signing of raw pieces and the gate's hash only provable on built servers | — |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.4 | All-or-nothing holds on every failure path; placement confined; the same name replaced by atomic rename; the sweep is lock-guarded | Narrow post-placement recheck race (recorded) | — |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.6 | Clean cut (RF-14, refusals removed) | — | — |
| 10 | Cleanup Completeness | 9.5 | Dead paths removed with evidence | — | — |

## Findings

None.

## Follow-ups

- Follow-ups this review added: None.

## Classification

- N/A (Pass).

## Recommended Recipient

- API/E2E engineer (primary); implementation engineer (informational).

## Residual Risks

- **Real HTTP is unproven so far.** The in-process tests replace HTTP and the gate's signature check. The real-gate hash of an octet-stream piece and the scoped body limit need the two-server E2E (AC-001 … AC-007, AC-010), with a tampering proxy (AC-003) and a stopped peer (AC-006).
- **AC-007 timing (C-08).** After a history delete, a file received less than 24 h ago is freed only at a later sweep (the next startup or the next delete after 24 h). There is no periodic sweep. API/E2E should test AC-007 against this rule. The Solution Designer may want AC-007's wording to say so.
- **Files open at their resolved path (C-01).** A symlink swapped in between could escape the workspace; this needs a concurrent swap (design residual).
- **A hostile paired peer (C-03, C-11).** It could test whether this node holds a content (RF-11 status), replace a file under another sender's run ID it knows, or answer falsely. Pairing is the accepted trust boundary.
- **Upload before admission (C-04).** A refused call may upload first; the bytes are swept after 24 h.
- **Tool-call limit (C-09).** The 1 h limit applies to every Agent Tools call on Codex and Claude. AGY/Grok/ACP limits are unknown (FU-001).
- **Narrow races.** A Task closing between placement and the log commit, or a log write that fails, leaves a placed (or replaced) file without its message (AR-002 class).
- **AC-002 wording (C-10)** and the new `REFERENCE_FILE_NAME_REPEATED` (C-05) are for the Solution Designer's documents.
- **Both nodes need this release** (DESIGN.md rule 9). `origin/personal` has moved on; integration is delivery's.

## Round 2 (CRR-004): IR-002, stale test constructions

- What failed at delivery (DEL-03): after the base refresh, the whole server unit suite had ten failures in three test files. Each constructs an owner without an input this ticket made required: the supervisor's `receivedFiles`; the standalone host's expected supervisor input; `RootTeamRun`'s `remoteFiles`.
- The fix (`e295b74b81`) gives those constructions the explicit no-peer collaborators: `NO_PEER_CHANNEL`, `NO_REMOTE_FILES`, `NO_FILES_RECEIVED` with a no-op `sweep`. It does the same for two more `AgentTeamRunManager` constructions found by search. The standalone-host test gains stronger assertions: one `remoteFiles` object shared by the supervisor, the collaboration and the platform runtime, with `receivedFiles` being its `received` part. No assertion was loosened.
- Verified: the diff above; no `src` change of this ticket since `e327ba2467`; the merge's `src` files do not intersect this ticket's. IMP-06 (whole server unit suite, 8698 passed) and IMP-08/09 (both typechecks at baseline) ran on `e295b74b81`; I reran nothing.
- My review gap: in CRR-001 I accepted the handoff's "Not run: full `test:unit` … the rest of the suite exercises nothing this change touches". The change made inputs required on owners that tests construct directly, and the typecheck baseline hides such stale constructions. The claim needed checking, and the whole suite was the cheap check. Delivery's proposed guide fix (`TESTING.md` § Choosing the path: run the whole server unit suite when an owner that tests construct gains a required input) is for the guide's owner (API/E2E) and the Solution Designer.
- Findings: None.

## Round 3 (CRR-006): IR-003, merge with autobyteus-22 (team-run-follows-definition)

- Scope: `Targeted Delta Review` of merge `575c4ec9ed` (parents `cc077b504c`, `6533d7be04`). I read the production conflict resolutions from the combined diff (`git show --cc`) and checked each point where the two tickets meet.
- Conflict resolutions (production):
  - `root-team-run.ts`: the base moved `isCurrentAgent` and `isLiveAgent` into `TeamRunMemberAuthority` (`this.members`). This ticket's `receivedFilesFor`, `remoteSend` (with `outgoing`), `receivedFiles` and `memberFolderOf` are kept, the last on the base's `requireContainingTeamRun`.
  - `team-root-materializer.ts`: `remoteFiles` and `memoryLocator` (D-6) sit beside the base's `membership`/`changeNotices`.
  - `collaboration-composition.ts`, `start-standalone-application-host.ts`, `build-studio-server.ts`: both sides' inputs kept.
- Where the tickets meet:
  - The router's step 1 is now the base's `ownsAgentRun`. On all three roots it includes `hasAgentExecution`, which still includes `remoteLinks.has`, so RF-14's `NODE_REQUIRED` still comes from the root's `deliverExact`.
  - The Team `deliverExact` remote branch is unchanged; the base's former-member refusal is on the local path.
  - The engine checks the receiver with `isCurrent` before any received-files plan (`acceptFromRemote`), so a member that is leaving (which `requireContainingTeamRun` now also resolves) receives no files.
  - The engine's sender checks are now the base's `maySendAs`. As before (C-04), `RemoteMessageSend` uploads before `prepareRemoteSend`, so a refused sender's bytes are left unlinked and swept.
- Size: `root-team-run.ts` 477 non-empty lines after the merge, under 500 (the base's own version grew it).
- Tests: the base's membership collaborators are combined with this ticket's inputs, the base's new integration test gets `remoteFiles`/`peerRunAdmission`, and the construction search was repeated.
- Evidence I read; I reran nothing:
  - IMP-10: both typechecks at baseline;
  - IMP-11: the whole server unit suite, 8764 passed;
  - IMP-12: the Team integration tests, 58 passed;
  - IMP-13: the rebuilt two-server E2E, 55 passed.
- Findings: None.

## Round 4 (CRR-008): Full Re-Audit at IR-004 (merge with autobyteus-591)

### Why a full re-audit

The user asked for a complete review, not a delta. The user also asked that problems belonging to this ticket be fixed in it rather than recorded as follow-ups. The branch now merges autobyteus-22 and autobyteus-591 into this ticket's message path. So I re-read the whole ticket at HEAD `5cbffaded7` (merge `bcd05494cb`, parents `ef09221c17` and `9f6add773b`):
- `outgoing-files.ts`, `received-files.ts`, the engine order, `remote-message-send.ts`;
- the router and `CrossRunMessageDelivery` as merged;
- the three roots' accept and `deliverExact` paths, the receiver, gateway, client and routes;
- the compositions.

I re-judged every follow-up with three questions:
1. Did this change introduce it?
2. Is it in the code, contract or texts this ticket adds or changes?
3. Is it in an artifact this ticket already edits, where the fix is small?

"Prefer a follow-up when unsure" was my earlier tiebreaker. It does not override those three questions.

### The merge with autobyteus-591 (IR-004)

- **M-1 Router order.** The order is: the peer, then `peerRunNodeRefusal` (reads only), then 591's `admitPeerRun` (may reopen a closed Task and tell the peer "open"), then the path. A call without the right `node` changes nothing. Correct, and better than 591's own order.
- **M-2 Node rule.** It is shared through `continuesClosedPeerRun`: a wrong `node` gets `NODE_MISMATCH`; with no `node`, a closed run gets `CLOSED` unless the sender is the assigner who may continue it; otherwise `NODE_REQUIRED`. It matches DEC-011 and 591 DN-9.
- **M-3 Receiver.** Files are verified before any root; 591's "opened by" record is written after an accepted message or work packet. Both kept.
- **M-4 Saved Task with files to a peer run (591 DN-8).** It is still refused, now with a text that no longer says "yet" (`savedTaskFiles`). Whether to copy those files is FU-007 (below).
- Compositions, hosts, gateway and routes keep both sides. File sizes stay under 500 lines (`peer-client.ts` 480, `root-team-run.ts` 477, `task-delegation.ts` 473).
- The evidence, which I read and did not rerun:
  - IMP-14: typechecks at baseline;
  - IMP-15: the whole server unit suite, 8812 tests;
  - IMP-16: integration, 116 tests;
  - IMP-18: two-server, 59/59, after the RC-19 test fix. That case now reads stored Messages instead of the 100-event projection window, which the merged case count overflowed.

### Findings

| ID | Finding | Evidence | Ticket scope | Classification / owner |
| --- | --- | --- | --- | --- |
| CR-587-01 | **Local file checks run after a Task reopen.** With `node`, the router runs 591's `admitPeerRun` first: for the assigner it reopens the closed Task and tells the peer "open". Then `RemoteMessageSend` runs `OutgoingFiles.send`. If a file is then refused (outside the workspace, a folder, too large, two of one name) or its upload fails, the Task stays reopened and the peer was told "open". The agent's answer names only the file and says nothing of the reopen. The local path appends "its Task is open again" (`notDeliveredAfterReopen`); this path does not (`peer-run-message-delivery.ts` returns the root's refusal as is). The implementation's own new case codifies the order ("B is told open first, then the file is uploaded"). | `global-agent-run-message-router.ts` (merged order); `cross-run-message-delivery.ts` `admitPeerRun`; `remote-message-send.ts`; `outgoing-files.ts`. Scenario: an assigner continues its closed remote task agent and attaches a file from outside its workspace (SEC-1, a supported edge) | This ticket: the merge composed the two orders, and the file sequence is this ticket's | `Design Impact` (Solution Designer). Choose one: (a) run `OutgoingFiles`' local checks (RF-3, RF-4 total, names) before `admitPeerRun`, and upload after; or (b) keep the order and say "its Task is open again" on every refusal after a reopen. (a) is cleaner; it needs `OutgoingFiles` split into check and transfer, with one owner of the order |
| CR-587-02 | **A piece damaged in transit tells the agent to re-pair** (was FU-003). The gate refuses the piece 401 (body hash); `PeerClient` maps any 401 from a peer that still answers as itself to `PEER_NOT_PAIRED` ("… are not paired … pair them again", `peer-client.ts:447, 471`). The agent reads `REFERENCE_FILE_TRANSFER_FAILED` with that reason and is pointed at the wrong action. REQ-006 asks for a clear reason (which file, why) | RC-56 `damaged` (API-06); `peer-client.ts` | This ticket: its new transfer path, and its REQ-006 (moved from follow-up) | `Local Fix` (implementation). For a piece refused 401 after the same call's status succeeded (pairing just proven), report the piece as damaged or refused in transit ("try again"). Do not change the gate's codes (NA-9) |
| CR-587-03 | **`NODE_REQUIRED` / `NODE_MISMATCH` can name a raw node ID** (was FU-004). `peerName` falls back to the node ID when the peer is no longer registered, so the agent is told to pass `node: "srv_…"`, which no call accepts | `nodeRequired(peerName(nodeId))` in the roots' `deliverExact`, `peerRunNodeRefusal`, `sendToPeerRun` | This ticket: introduced by RF-14's refusals (moved from follow-up) | `Local Fix` (implementation). When the run's node is not a registered peer, refuse with a text that says the node is no longer paired, and give no `node` to pass |
| CR-587-04 | **A second path lookup between the check and the open** (design: "opened once … no second path lookup"). `open()` resolves the path with `realpath`, checks containment, then opens the resolved path by name again. A path component swapped in between could escape the workspace | `outgoing-files.ts:126-141`; design § Ownership Map (`OutgoingFiles`) | This ticket: the code does not match its design, and the fix is small | `Local Fix` (implementation). Open the given path once, `fstat` the handle, `realpath` the path, `stat` that and require the same `dev`/`ino` before the containment check; else refuse |
| CR-587-05 | **The contract stories cannot prove this ticket's steps.** The 461 model, which this ticket already edits (T-001), lacks autobyteus-565's `counterpart` and autobyteus-22's `copiedFrom`. So the gated suite stops at §5.1 S1, and this ticket's S18/S19 never run there (was FU-002, FU-006) | API-R4 `API-07` logs | This ticket by question 3 (an artifact it edits), though the fields are other tickets' rules | Scope confirmation for the Solution Designer; then `Local Fix` for API/E2E (encode `counterpart` and `copiedFrom` in the model, regenerate, `--check`, gated rerun) |

Recommendations for the Solution Designer, not blocking:
- **RF-14 lives in several places:** the router (`peerRunNodeRefusal`), `CrossRun.route`, the three roots' `deliverExact`, and `sendToPeerRun`. The 591 merge had to split and reorder it (M-1, M-2), which shows how easily it can drift. One owner of "which node a run is on, and the refusal" would be cleaner. The architecture review accepted the current shape, so this is the Solution Designer's call.
- **Requirement questions:**
  - FU-007: copy a saved Task's reference files to a peer run? This is new product behavior at 591's and 587's intersection, a `Requirement Gap`.
  - AC-002's wording ("no `node`").
  - AC-007's timing under the 24 h cleanup rule.

Kept as follow-ups (only other functionality, and the ticket does not need them):
- FU-001: AGY/Grok/ACP limits; needs signed-in runtimes.
- FU-005: autobyteus-22's TF-04; fails identically on the base.
- The shared `AgentOperationResult` gaining optional fields: a trend across tickets.

### Scorecard (full re-audit)

- Overall score: 9.2/10

| Priority | Category | Score | Why / what holds it down |
| --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.2 | DS-002 now begins with 591's admission; the reopen and the upload are ordered by two owners (CR-587-01) |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.2 | RF-14 in several places (recommendation) |
| 3 | API / Interface / Query / Command Clarity | 9.0 | A refusal can name a node ID no call accepts (CR-587-03) |
| 4 | Separation of Concerns and File Placement | 9.4 | Unchanged |
| 5 | Shared-Structure / Data-Model Tightness | 9.3 | `AgentOperationResult` growth (follow-up) |
| 6 | Naming Quality and Local Readability | 9.3 | Unchanged |
| 7 | API/E2E Readiness | 9.0 | The gated contract stories cannot run this ticket's steps (CR-587-05) |
| 8 | Runtime Correctness And Behavioral Fidelity | 8.8 | A refused call can leave a Task reopened without saying so (CR-587-01); a misleading reason (CR-587-02); a second lookup in the containment check (CR-587-04) |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.6 | Unchanged |
| 10 | Cleanup Completeness | 9.3 | The "yet" text replaced; dead paths removed |

## Round 5 (CRR-009): Full Re-Audit at IR-005 (SR-010, SR-011)

Scope: `Full Re-Audit`. IR-005 (`07b4b83cef`, `e2a95cfc39`) changes the router's order, adds the one RF-14 owner (`PeerRunNodes`), removes the roots' remote branches, changes `OutgoingFiles`, `RemoteMessageSend` and `TaskDelegation`'s existing-copy path, and lets saved-Task files travel (DEC-009). Shared boundaries changed, so every check was rerun against SR-010/SR-011 at HEAD `15c476d402`. The scope test from round 4 applies.

### Prior findings

| ID | Status | Verification |
| --- | --- | --- |
| CR-587-01 | Resolved | `GlobalAgentRunMessageRouter.deliverToPeer`: peer → `PeerRunNodes.check` → `OutgoingFiles.send` → `admitPeerRun` → delivery with the descriptors. After a `"reopened"` admission, a refusal carries `notDeliveredAfterReopen`. A refused file or failed upload reopens nothing. `RemoteMessageSend` no longer uploads and no longer checks the node |
| CR-587-02 | Resolved | `OutgoingFiles.transfer`: a piece refused `PEER_NOT_PAIRED` after the same call's status succeeded reads `REFERENCE_FILE_TRANSFER_FAILED` "damaged or refused in transit … Try again". The gate's codes are unchanged |
| CR-587-03 | Resolved | `PeerRunNodes.check`: a node no longer registered (`registeredPeerName` → null) gets `NODE_NOT_PAIRED`, with no node to pass |
| CR-587-04 | Resolved | `OutgoingFiles.open`: the given path is opened once (`O_RDONLY|O_NONBLOCK`). `fstat` must be a regular file and equal `realpath` + `stat` on `dev`/`ino`, then containment is checked; the hash and pieces are read from that handle |
| CR-587-05 | Open, API/E2E's | Scope confirmed in SR-010 R4; the model still lacks `counterpart`/`copiedFrom` until API/E2E's round |
| RF-14 consolidation (round-4 recommendation) | Done | `PeerRunNodes` is the one owner, called by the router before any path and by `TaskDelegation`'s existing-copy path. `peerRunNodeRefusal`, the roots' `deliverExact` remote branches, `sendToPeerRun`'s mismatch check and CrossRun's RF-14 refusal are removed |

Also checked:
- **Saved Task to a new copy (`task_id` + `node`).** The refusal is removed. `toPeerRun` passes `taskContextFiles` only for a saved Task's own files. The work packet now carries `work.delegation.text`, which is still the description for described work (`task-delegation.ts:498-501`).
- **Existing copy.** The order is: `PeerRunNodes.check` (a local copy given `node` gets `NODE_MISMATCH` naming this node), then `assertAssignable`, then the restorability check (local only), then the upload, then `assignExistingTaskExecution`, then the "open" notice and the message.
- **Parser and texts.** `node` is accepted on the existing-copy form.
- **Row 13.** A sender without `node` now gets `NODE_REQUIRED` before `CLOSED` (the node is checked first, read-only; with `node` it gets `CLOSED`), as SR-010 R2 orders it. That replaces 492's "with or without `node`", as RF-14 requires.
- **Sizes.** All under 500. `task-delegation.ts` is at 498: no headroom for the next change there.
- **Evidence.** IMP-19: typechecks at baseline. IMP-20: the whole unit suite, 8821 tests. IMP-21: integration, 116. IMP-23: two-server, 59/59.

### New findings

| ID | Finding | Evidence | Ticket scope | Classification / owner |
| --- | --- | --- | --- | --- |
| CR-587-06 | **`remoteNodeOf` is optional, with a silent fallback.** `ActiveRootMessageBoundary.remoteNodeOf?` is optional, and `PeerRunNodes.nodeOf` reads `resolve(root)?.remoteNodeOf?.(target) ?? null`. All three production roots implement it, so the option serves only test doubles (DESIGN.md rule 11; P16: a required collaborator made optional, then `?? fallback`). It matters because removing the roots' `deliverExact` remote branches relies on `PeerRunNodes` catching a linked run first. A root kind without the method would let a linked remote run ID fall through to `deliverExact`/`deliverToRunId`, with a misleading "not in this run" refusal | `active-collaboration-root-directory.ts:30`; `peer-run-nodes.ts:28`; the three roots' `remoteNodeOf` | This ticket: introduced in IR-005 | `Local Fix` (implementation). Make `remoteNodeOf` required on the boundary (the directory's `reserve` already checks required methods, as for `ownsAgentRun`); drop the `?.`/`??`; give the test doubles the method |
| CR-587-07 | **Roots receive a dependency they no longer use.** The three roots still take the `RemoteFiles` bundle (`outgoing` + `received`) but use only `received`, since `RemoteMessageSend` lost its upload. Their signatures name a collaborator they do not need (P16: an owner's dependencies show what it needs) | The roots' options; `remoteSend: new RemoteMessageSend({ engine, links })` | This ticket: touched files, the handoff's own "choice to look at" | `Local Fix` (implementation). Pass `ReceivedFilesPlacement` (`remoteFiles.received`) to the roots, materializer and manager instead of the bundle |
| CR-587-08 | **DEC-009 opens a two-step route around DEC-001.** RF-3's new exception lets a saved Task's context files leave the node from anywhere. An agent with `create_task`/`update_task` can attach as context files "absolute local file paths" from anywhere on the node: the context store checks only that the path is absolute, regular, readable, and an allowed type by extension (`project-task-context-store.ts:24-29`, `context-file-upload-policy.ts:52-55`). It then gives that Task to another node (`delegate_task` with `task_id` + `node`). A misled agent, DEC-001's own threat ("another project's data"), can thus send any allowed-type file (`.pdf`, `.json`, `.csv`, `.txt` …) off the machine in two calls, though `reference_files` refuses the same file. Before DEC-009, context files never left the node | `outgoing-files.ts` (`taskContextFiles` skips containment); `project-task-tool-contract.ts:20-21`; the context store | This ticket: the change exposes an existing permission to a new off-node path (`ticket-scope.md`: an old security risk the change exposes) | `Requirement Gap` (Solution Designer, likely the founder: it is a security decision). Options: (a) an agent's `create_task`/`update_task` may attach only files inside its workspace (the person's app upload stays free); (b) only context files a person attached travel; (c) accept, recorded with the founder |

Not promoted:
- **Upload before a cheap closed-check.** A sender that is not the assigner, messaging a closed peer run with `node` and files, uploads everything before `admitPeerRun` refuses `CLOSED`. SR-010 R1 chose this order and records that the bytes are swept. A read-only closed pre-check would avoid the futile upload, at the cost of splitting the closed rule again. Recommendation only.
- **Hard links.** A hard link inside the workspace to a file outside passes RF-3: same inode, resolved path inside. Paths cannot see hard links, and making one is a deliberate act. Residual risk.
- **A defensive fallback.** `wrongNode.message ?? wrongNode.code ?? "The node does not match."` in `TaskDelegation` is unreachable, because the node refusals always carry a message. Cosmetic.

### Scorecard (full re-audit)

- Overall score: 9.3/10

| Priority | Category | Score | Why / what holds it down |
| --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.5 | One order on the `node` path, one owner each |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.3 | RF-14 has one owner now; its link lookup is an optional method (CR-587-06) |
| 3 | API / Interface / Query / Command Clarity | 9.3 | `NODE_NOT_PAIRED`; `node` on the existing-copy form |
| 4 | Separation of Concerns and File Placement | 9.3 | `task-delegation.ts` at 498 lines |
| 5 | Shared-Structure / Data-Model Tightness | 9.3 | Roots take a bundle they half use (CR-587-07) |
| 6 | Naming Quality and Local Readability | 9.3 | — |
| 7 | API/E2E Readiness | 9.1 | CR-587-05 and AC-012 over real HTTP still to do |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.1 | CR-587-01 … 04 resolved; the DEC-009 route around DEC-001 is undecided (CR-587-08) |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.6 | — |
| 10 | Cleanup Completeness | 9.3 | The remote branches, the duplicate rule and the saved-Task refusals are removed |

## Round 6 (CRR-010): Full Re-Audit at IR-006 (SR-012)

Scope: `Full Re-Audit`, as the user asked for this ticket. Since CRR-009 the only production change is `a0c233492b` (18 files: owner signatures and the root boundary); `1d0a036bf4`, `ced5541c43` and `8294b67f53` are documents. Every structural check and score from round 5 was revisited against that change. Everything else in `src` is byte-identical to what round 5 audited.

### Prior findings

| ID | Status | Verification |
| --- | --- | --- |
| CR-587-06 | Resolved | `ActiveRootMessageBoundary.remoteNodeOf` is required; `ActiveCollaborationRootDirectory.reserve` refuses a boundary without it (beside `ownsAgentRun`); `PeerRunNodes.nodeOf` calls it with no `?.`/`??`. Test doubles declare `remoteNodeOf: () => null` |
| CR-587-07 | Resolved | The standalone root and builder, `RootTeamRun`, the Team materializer and manager, `AgentOrgRun`'s options, the Org scope builder and the application platform's runtime/kernel take `receivedFiles: ReceivedFilesPlacement`. The supervisor's input is `ReceivedFilesPlacement & { sweep }`, one owner, still refused loudly when missing (`general-process-run-supervisor-input.ts:118`); its `remoteFiles` input is gone |
| CR-587-08 | Closed by decision | DEC-010 (c), the Solution Designer within the founder's delegation, confirmed by the founder (`requirements-doc.md`, SR-012). Nothing to build; the route is an accepted, recorded risk |
| CR-587-05 | Open, API/E2E's | Unchanged |

### New finding

| ID | Finding | Evidence | Ticket scope | Classification / owner |
| --- | --- | --- | --- | --- |
| CR-587-09 | **`RemoteFiles.received` is read only by a test.** After CR-587-07 the `RemoteFiles` bundle (`transferred-files.ts:46`) has one production consumer, `composeCollaboration`, which reads only `remoteFiles.outgoing` (`collaboration-composition.ts:259, 305`). No production code reads `remoteFiles.received`. The standalone host lifecycle test asserts it (`standalone-application-host-lifecycle.test.ts:359`). DESIGN.md rule 11: production code keeps no field that only tests read. The bundle now only wraps `outgoing` | grep of `src` for `RemoteFiles`/`.received` | This ticket: left by CR-587-07's fix, in touched files; a project rule | `Local Fix` (implementation). `composeRemoteFiles` returns `{ receivedFiles, outgoingFiles }`. `composeCollaboration` takes `outgoingFiles: Pick<OutgoingFiles, "send">`. Remove the `RemoteFiles` type. The host test asserts what production passes (the same `receivedFiles` object to the supervisor and the platform runtime; `outgoingFiles` to the collaboration) |

### Re-audit of the rest (round 5's checks against IR-006)

- **Spine and ownership.** Unchanged and sound: the router's one order on the `node` path, `PeerRunNodes` as RF-14's one owner, `admitPeerRun` as the closed rule's one owner (SR-012 keeps the order), the engine's plan → reserve → place → commit.
- **Visible dependencies (P16).** Improved: each owner now names only what it uses, except CR-587-09's bundle. `OutgoingFiles`' process lookup of the run manager is unchanged (accepted at CRR-001).
- **Sizes.** All under 500: `task-delegation.ts` 498 (untouched), `peer-client.ts` 483, `root-team-run.ts` 480, `agent-team-run-manager.ts` 471.
- **Evidence (I read it; reran nothing).** IMP-24: typechecks at baseline. IMP-25: the whole unit suite, 8821 tests. IMP-26: integration, 116. IMP-27: rebuilt two-server, 59/59.

### Scorecard (full re-audit)

- Overall score: 9.4/10

| Priority | Category | Score | Why / what holds it down |
| --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.5 | One order, one owner each |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.5 | `remoteNodeOf` required; roots take only what they use |
| 3 | API / Interface / Query / Command Clarity | 9.4 | — |
| 4 | Separation of Concerns and File Placement | 9.3 | `task-delegation.ts` at 498 lines |
| 5 | Shared-Structure / Data-Model Tightness | 9.2 | `RemoteFiles` keeps a field only a test reads (CR-587-09) |
| 6 | Naming Quality and Local Readability | 9.3 | — |
| 7 | API/E2E Readiness | 9.2 | CR-587-05 and AC-012 over real HTTP still API/E2E's |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.4 | CR-587-08 decided (DEC-010); no behavior change in IR-006 |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.6 | — |
| 10 | Cleanup Completeness | 9.2 | CR-587-09 |

## Latest Authoritative Result

- Review Decision: `Fail` (round 6, CRR-010, full re-audit)
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.4/10. Shared-Structure, API/E2E Readiness and Cleanup 9.2.
- Classification: `Local Fix` (implementation): CR-587-09. `Local Fix` (API/E2E, scoped): CR-587-05.
- Recommended Recipient: implementation engineer
- Notes: CR-587-06 and -07 resolved; CR-587-08 closed by DEC-010. CR-587-09 is the last code item I found.
