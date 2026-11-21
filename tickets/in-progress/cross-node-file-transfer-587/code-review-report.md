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
- Relevant Implementation Revision IDs: IR-001, IR-002, IR-003
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-006`
- Current Review Round: `3`
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

## Latest Authoritative Result

- Review Decision: `Pass` (round 3, CRR-006)
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.4/10 (unchanged)
- Recommended Recipient: API/E2E engineer (an implementation-owned fix returns through API/E2E); delivery asked for the package back quickly
- Notes: round 1's notes and residual risks stand.
