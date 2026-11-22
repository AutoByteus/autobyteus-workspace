# Implementation Revision Record — cross-node-file-transfer-587 (autobyteus-587)

The current code and `implementation-handoff.md` remain authoritative. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer, `design-review-report.md`, round 2 (Pass) | N/A | `Initial Baseline` | SR-009, ARCH-REV-002, CRR-001 | Implemented; Code Review Pass (CRR-001, no findings); next: API/E2E |
| IR-002 | Delivery Engineer, `release-deployment-report.md` § Escalation / Reroute (DEL-03, whole unit suite after the base refresh) | DEL-03 stale tests 1–3 | `Local Fix` | CRR-001, CRR-003, API-REV-002; DR: N/A (not yet created) | Stale test fixtures given the new inputs; whole server unit suite Pass (1050 files, 8698 tests); Code Review Pass (CRR-004, no findings); next: API/E2E |
| IR-003 | Delivery Engineer, `release-deployment-report.md` § Delivery Round 2 (merge with origin/personal 6533d7be04 conflicts) | Round-2 merge conflict (3 production files, 19 test files) | `Local Fix` | CRR-004, API-REV-003, CRR-005; DR: N/A | Merged and resolved (575c4ec9ed); typechecks, whole unit suite (8764 tests), Team integration (58) and two-server E2E (55) Pass; Code Review Pass (CRR-006, no findings); next: API/E2E |
| IR-004 | Delivery Engineer, `release-deployment-report.md` § Delivery Round 3 (merge with origin/personal 9f6add773b conflicts, autobyteus-591) | Round-3 merge conflict (9 production, 3 docs, 17 test files) | `Local Fix` | CRR-006, API-REV-004, CRR-007; DR: N/A | Merged and resolved (bcd05494cb, f86a45d99f, RC-19 test fix cc6a9f2f60); typechecks, whole unit suite (8812 tests), integration (116) and two-server E2E (59) Pass; next: Code Review |
| IR-005 | Code Reviewer `code-review-report.md` CRR-008 (Fail, full re-audit at IR-004) → Solution Designer SR-010 / SR-011, Architecture Reviewer ARCH-REV-003 / ARCH-REV-004 | CR-587-01 … 04 (CR-587-05 is API/E2E's); DEC-009; AR-007, AR-008 | `Design Impact` (CR-587-01, DEC-009) + `Local Fix` (CR-587-02 … 04) | CRR-008, SR-010, SR-011, ARCH-REV-003, ARCH-REV-004 | Implemented (07b4b83cef, e2a95cfc39); typechecks, whole unit suite (8821), integration (116), two-server E2E (59) Pass; next: Code Review |
| IR-006 | Code Reviewer `code-review-report.md` CRR-009 (Fail, full re-audit at IR-005), decided by the Solution Designer (SR-012) | CR-587-06, CR-587-07 (CR-587-08 decided as DEC-010 (c): nothing to build) | `Local Fix` | CRR-009, SR-012 | Implemented (a0c233492b); typechecks, whole unit suite (8821), integration (116), two-server E2E (59) Pass; next: Code Review |
| IR-007 | Code Reviewer `code-review-report.md` CRR-010 (Fail, full re-audit at IR-006) | CR-587-09 | `Local Fix` | CRR-010 | Implemented (11b7ed5444); typechecks, whole unit suite (8821), integration (116), two-server E2E (59) Pass; next: Code Review |

## Revision Entries

### IR-001 — Cross-node reference files and the node rule (RFC-001)

- Triggering role, report path, and round: Architecture Reviewer, `tickets/in-progress/cross-node-file-transfer-587/design-review-report.md`, ARCH-REV-002 (Pass on SR-008; spine wording SR-009).
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: implementation complete for RF-2 … RF-14 on the server; server and web typechecks pass; the affected server unit set passes; two-server E2E left to API/E2E.
- Related solution revision IDs: SR-009
- Related architecture-review revision IDs: ARCH-REV-002
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline is recorded: first implementation of the reviewed package.
- Approved behavior or requirement IDs affected: REQ-001 … REQ-009; AC-001 … AC-011; RFC-001 RF-2 … RF-14; DS-001 … DS-005.
- Implementation delta:
  - New owners: `OutgoingFiles` (sender: workspace containment, one open per file, SHA-256, status, skip/resume, 8 MiB pieces), `ReceivedFiles` (receiver: store, pieces, verify, plan/place, sweep), shared types in `transferred-files.ts`, `composeRemoteFiles`.
  - Peer contract: status `POST /rest/remote/received-files/status`, raw signed `PUT /rest/remote/received-files/:sha256`; `files` on `messages` / `run-messages` requests; `PeerClient` raw-body signing.
  - Sending: `RemoteMessageSend` keeps only `sendToPeerRun` (files → prepare → deliver → commit; `NODE_MISMATCH`); `TaskDelegation.toPeerRun` uploads before `startDelegatedRun`; `files_sent` in both tool results.
  - Receiving: engine `acceptFromRemote` plans paths, reserves, places, then commits (cancel on failure); the three roots' work-packet accept places before posting; `RemoteMessageReceiver` verifies the files before any root.
  - RF-14: roots' `deliverExact` remote branch → `NODE_REQUIRED`; CrossRun `peerRunAdmission` (renamed from `closedPeerRunRefusal`) with `NODE_REQUIRED` / `NODE_MISMATCH`.
  - Cleanup: sweep after a history delete (`DelegatedWorkGuard`) and at startup; Memory Sync skips `received_files`.
  - Runtime limits: Codex `tool_timeout_sec: 3600`, Claude `timeout: 3_600_000`; setting `AUTOBYTEUS_RECEIVED_FILE_MAX_MB`.
  - Team root: the manager passes a memory locator built from its own memory folder (the root's option was unset; see handoff, deviation D-6).
  - Removed: both attachment refusals, `ATTACHMENTS_NOT_SUPPORTED`, `RemoteMessageSend.send` / `RemoteMessageSendInput`, forced `referenceFiles: []` on remote lines.
  - Docs: CM-11 rewritten, CM-14, `remote_collaboration.md`, `agent_tools.md`, `agent_communication.md`, GLOSSARY, `autobyteus-web/docs/settings.md`.
- Changed files or areas: see `implementation-handoff.md` § Key Files Or Areas.
- Local validation and result: IMP-01 … IMP-05 in the handoff (all Pass).
- Next recipient or routing: Code Review (Large / High).
- Remaining limitations or risks: see the handoff's Known Risks (AGY/Grok/ACP limits FU-001; placement-then-append residual; AC-002 wording).
- Code review: Pass, CRR-001, no findings (`code-review-report.md`); the reviewer routed it to API/E2E. Recorded only; no implementation change.

### IR-002 — Stale host fixtures after the base refresh

- Triggering role, report path, and round: Delivery Engineer, `tickets/in-progress/cross-node-file-transfer-587/release-deployment-report.md` § Escalation / Reroute; evidence `evidence/DEL-post-integration/DEL-03-whole-unit-suite-FAIL-stale-tests.log` (whole unit suite on 3be417f8df / ef53fadd52: 10 failed tests in 3 files).
- Triggering finding IDs: DEL-03 items 1–3.
- Classification: `Local Fix` (test code only).
- Prior authoritative result: IR-001, code review CRR-001 Pass, API/E2E API-REV-002 Pass, test-code review CRR-003 Pass; the whole unit suite had not been run.
- Current authoritative result: the stale constructions give the inputs this ticket made required; whole server unit suite Pass: `Test Files  1050 passed | 5 skipped (1055)`, `Tests  8698 passed | 9 skipped (8707)` (IMP-06, commit e295b74b81).
- Related solution revision IDs: N/A
- Related architecture-review revision IDs: N/A
- Related code-review revision IDs: CRR-001, CRR-003
- Related API/E2E revision IDs: API-REV-002
- Related delivery revision IDs: N/A (delivery has not created DR-001 yet)
- Why this implementation revision is recorded: delivery's whole unit run found tests that construct a supervisor, a Team root or the standalone host without `remoteFiles` / `receivedFiles`. The typecheck baseline tolerated them (they already had older type errors, or cast their input), and IMP-03 was an affected set that left out `tests/unit/agent-execution` (outside `backends`) and `tests/unit/application-orchestration`.
- Approved behavior or requirement IDs affected: none (no production change); the tests now build the hosts as the approved composition does.
- Implementation delta (tests only):
  - `general-process-run-supervisor-ownership.test.ts`: `receivedFiles: NO_FILES_RECEIVED`; the conflicting Team manager gets `remoteChannel` and `remoteFiles`.
  - `standalone-application-host-lifecycle.test.ts`: the expected supervisor input names `remoteFiles` and `receivedFiles`; new assertions that the supervisor, the collaboration composition and the platform runtime get the same `remoteFiles`, and that the swept `receivedFiles` is its `received`. No assertion loosened.
  - `application-team-input-root-dispatch.test.ts` (`RootTeamRun`), `agent-team-run-manager-lifecycle.test.ts` and `tests/e2e/run-history/recent-run-projection-graphql.e2e.test.ts` (`AgentTeamRunManager`): `remoteChannel: NO_PEER_CHANNEL, remoteFiles: NO_REMOTE_FILES`. The last two were found by a scan for constructions, not by a failure: any Team root they build would throw on `remoteFiles.outgoing`.
  - `tests/helpers/explicit-host-collaborators.ts`: `NO_FILES_RECEIVED` gains a no-op `sweep`.
- Search for other hidden constructions: every test (and `test-support/`) constructing `RootTeamRun`, `GeneralProcessRunSupervisor` / `createGeneralProcessRunSupervisor` / `requireGeneralProcessRunSupervisorInput`, `AgentTeamRunManager` (`new`, `initializeProcessInstance`), `AgentOrgExecutionScopeBuilder`, `materializeTeamRoot`, `StandaloneAgentRunRootManager`, `DelegatedWorkGuard`, `RemoteMessageReceiver`, `PeerGateway`, `composeRemoteCollaboration`, `TaskDelegation`, `CrossRunMessageDelivery`, `RemoteMessageSend`, `buildApplicationPlatformRuntime`, `buildApplicationExecutionScopeKernel` was checked for the new inputs. Left as is: the architecture test reading source text, and the deliberate invalid-input cases (`as never`) of the kernel builder and `required-host-owners`.
- Changed files or areas: the five test files and the helper above (commit e295b74b81).
- Local validation and result (all Pass, on e295b74b81): IMP-06 whole server unit suite; IMP-07 the five changed test files (44 tests); IMP-08 server typecheck (baseline unchanged, 1005 in 315 files); IMP-09 web typecheck (baseline unchanged, 86 in 36 files) — see the handoff.
- Next recipient or routing: Code Review (the package stays Large / High; test-only change).
- Remaining limitations or risks: none new. The guide gap delivery names (a change adding a required input to an owner tests construct should run the whole unit suite) is for TESTING.md's owner.
- Code review: Pass, CRR-004, no findings (`code-review-report.md`); the reviewer routed it to API/E2E. Recorded only; no implementation change.

### IR-003 — Merge with autobyteus-22 (team-run-follows-definition)

- Triggering role, report path, and round: Delivery Engineer, `tickets/in-progress/cross-node-file-transfer-587/release-deployment-report.md` § Delivery Round 2 (`git merge origin/personal` conflicts in 22 files).
- Triggering finding IDs: the round-2 merge conflict.
- Classification: `Local Fix` (integration of two Large changes in production code).
- Prior authoritative result: IR-002 with CRR-004, API-REV-003, CRR-005 Pass, on a5ae791726 / cc077b504c.
- Current authoritative result: origin/personal 6533d7be04 merged as 575c4ec9ed; both tickets' behavior kept; both typechecks, the whole server unit suite, the Team integration tests and the gated two-server E2E on a rebuilt server pass.
- Related solution revision IDs: N/A
- Related architecture-review revision IDs: N/A
- Related code-review revision IDs: CRR-004, CRR-005
- Related API/E2E revision IDs: API-REV-003
- Related delivery revision IDs: N/A (no DR yet)
- Why this implementation revision is recorded: the base reworked the Team root (`TeamRunMemberAuthority`, `TeamRunResolver`, `TeamRunMembership`, former members, `maySend`, `ownsAgentRun`); this ticket's Team-root and composition changes had to be merged onto it, and the merged root has been seen by no reviewer.
- Approved behavior or requirement IDs affected: none changed; DS-001/DS-002 receive paths and RF-14 re-checked on the merged root.
- Implementation delta:
  - Production conflicts: `root-team-run.ts` (the base moved `isCurrentAgent` / `isLiveAgent` into `TeamRunMemberAuthority`; this ticket's `memberFolderOf` kept, on the base's `requireContainingTeamRun`, which now also resolves a member that is leaving (`getAgentForOwnCommand`); a leaving member cannot receive a remote message, since `acceptFromRemote` checks the receiver is current before any plan); `collaboration-composition.ts` (both imports); `start-standalone-application-host.ts` (the base's `definitionChanges` / `teamChangeNotices` beside `remoteFiles` / `receivedFiles`).
  - Auto-merged production files changed by both sides (20, listed in the handoff) checked: the engine's sender check is now the base's `maySendAs` for `prepareRemoteSend` too (a member finishing its turn after leaving may still send), the remote receiver check stays `isCurrent`; the router's `ownsAgentRun` includes `hasAgentExecution` (remote links), so RF-14's `NODE_REQUIRED` still comes from the root; the Team `deliverExact` remote branch is unchanged beside the base's former-member refusal on the local path; the materializer and manager still pass `remoteFiles` and the manager's `memoryLocator`; all merged files stay under 500 non-empty lines (largest `root-team-run.ts` 477).
  - Test conflicts (19 files): the base's `teamMembershipTestCollaborators()` / `changeNotices` combined with `remoteChannel` / `remoteFiles` / `memoryLocator`; `required-host-owners` keeps both sides' inputs; the router test keeps the base's `ownsAgentRun` with `peerRunAdmission`.
  - Base test not in conflict but stale for this ticket: `tests/integration/agent-team-execution/team-run-follows-definition.integration.test.ts` (three `AgentTeamRunManager`s get `remoteFiles: NO_REMOTE_FILES`; `closedPeerRunRefusal` → `peerRunAdmission`). A scan of every construction of the owners that take the new inputs found no other.
- Changed files or areas: merge commit 575c4ec9ed.
- Local validation and result (all Pass, on 575c4ec9ed): IMP-10 both typechecks (server 1004 in 314 files, web 86 in 36, both at baseline); IMP-11 whole server unit suite (`Test Files  1057 passed | 5 skipped (1062)`, `Tests  8764 passed | 9 skipped (8773)`); IMP-12 Team integration tests (10 files, 58 tests); IMP-13 server rebuild and the gated two-server E2E file (55 tests) — see the handoff.
- Next recipient or routing: Code Review (Large / High; the merged Team root is production code no reviewer has seen).
- Remaining limitations or risks: the base moves fast; a later merge that touches the Team root again needs the same check.
- Code review: Pass, CRR-006, no findings (`code-review-report.md`); the reviewer routed it to API/E2E. Recorded only; no implementation change.

### IR-004 — Merge with autobyteus-591 (cross-node-task-close)

- Triggering role, report path, and round: Delivery Engineer, `tickets/in-progress/cross-node-file-transfer-587/release-deployment-report.md` § Delivery Round 3 (`git merge origin/personal` conflicts in 29 files).
- Triggering finding IDs: the round-3 merge conflict.
- Classification: `Local Fix` (integration of two changes of the same remote-messaging core).
- Prior authoritative result: IR-003 with CRR-006, API-REV-004, CRR-007 Pass, on ab7195a342 / ef09221c17.
- Current authoritative result: origin/personal 9f6add773b merged as bcd05494cb (fixture fix f86a45d99f); 591's closed-Task rules and this ticket's file transfer and RF-14 hold together; both typechecks, the whole server unit suite, the Team/collaboration/API/restart-resume integration tests and the gated two-server E2E on a rebuilt server pass.
- Related solution revision IDs: N/A
- Related architecture-review revision IDs: N/A
- Related code-review revision IDs: CRR-006, CRR-007
- Related API/E2E revision IDs: API-REV-004
- Related delivery revision IDs: N/A (no DR yet)
- Why this implementation revision is recorded: 591 (a closed Task's remote run stops on its node; the assigner's message continues it, DN-9; a saved Task to a peer run brings it back, DN-8) changed the router, `CrossRunMessageDelivery`, `RemoteMessageReceiver`, `TaskDelegation`, the gateway and the compositions that this ticket also changed. 591 was designed on the old CM-11 (linked messages without `node`), which RF-14 replaced.
- Approved behavior or requirement IDs affected: RF-14 (order of its refusals with 591's admission), DS-002 (the send after 591's admission), DEC-011 (kept); no requirement changed.
- Implementation delta (merge decisions, M-1 … M-4; the handoff lists them):
  - M-1 Router order: with `node`, the peer is found first; then the node rule (`CrossRunMessageDelivery.peerRunNodeRefusal`, read only); then 591's Task admission (`admitPeerRun`, which can reopen a Task and tell the node "open"); then the path. A call without the right node therefore reopens nothing and tells no node anything. 591 asked its admission before the peer lookup; the node rule needs the peer's node ID, and comes before the admission because the admission has effects.
  - M-2 Node rule (my `peerRunAdmission` renamed `peerRunNodeRefusal`; its closed check moved to 591's admission): `node` names another node → `NODE_MISMATCH`; no `node` and the run closed and the sender is not the assigner who may continue it → `TASK_AGENT_RESOURCE_CLOSED` (DEC-011, as before both tickets: row 13); no `node` otherwise → `NODE_REQUIRED` (the assigner is told the node, and continues the run with it). The continuation predicate is shared with `admitPeerRun` (`continuesClosedPeerRun`). `route`'s peer branch refuses through the same rule.
  - M-3 Receiving: `RemoteMessageReceiver` takes 591's `closedDelegations` (5th) and this ticket's `receivedFiles` (6th); files are verified before any root; 591's "opened by" record is written after an accepted message or work packet.
  - M-4 A saved Task with reference files given to a run on another node (591 DN-8) keeps 591's refusal, which used the removed "can't be sent … yet" text: new `REFERENCE_FILE_REFUSAL_TEXT.savedTaskFiles`. Copying a saved Task's files is neither ticket's approved behavior: FU-007.
  - Other production conflicts (compositions, host, gateway, `TaskDelegation` dependencies): both sides' collaborators kept; the startup sweep kept beside 591's `deletedRuns`.
  - Docs: CM-10 from 591 (and its "names the node only when it delegates" corrected for RF-14), CM-11 from this ticket; 591's continuation text says the message names the node; the node rule documented beside 591's admission (`agent_communication.md`, `remote_collaboration.md`); status table rows combined.
  - Tests: `testTaskSide(tasks, channel, { outgoing, peerRuns })` (both sides had added a third positional argument); fixtures combine both sides' collaborators; 591's continuations name the node (unit, in-process and the two-server file); my two-server cases renumbered RC-56 … RC-59 (591 holds RC-54, RC-55); RC-09 merged (591's saved Task with files with the new text; my workspace cases in place of 591's "files can't be sent" case); new in-process case: the assigner continues a closed remote run with a file (B told open, then the upload, then the message; the file lands; another sender's file is refused CLOSED before any upload).
  - RC-19 (two-server, test-side): with both tickets' cases the delegator makes 61 calls before RC-19 (591's file: 60), so the RC-06 reply leaves the run projection's latest-100-event conversation that RC-19 read as its history (cause: `recent-run-projection-policy.ts` `RECENT_RUN_PROJECTION_EVENT_LIMIT = 100`); RC-19 now reads the delegator's stored Messages, every page (cc6a9f2f60).
- Changed files or areas: merge commit bcd05494cb, f86a45d99f, cc6a9f2f60; `follow-ups.md` FU-007.
- Local validation and result: IMP-14 both typechecks at baseline (server 1000 in 313 files, web 86 in 36); IMP-15 whole server unit suite (`Test Files  1060 passed | 5 skipped (1065)`, `Tests  8812 passed | 9 skipped (8821)`); IMP-16 integration (18 files, 116 tests); IMP-17 rebuild and two-server E2E: RC-19 failed (cause above); IMP-18 after the fix: 59/59 — all on f86a45d99f / cc6a9f2f60, see the handoff.
- Next recipient or routing: Code Review (Large / High; the merged message path is production code no reviewer has seen).
- Remaining limitations or risks: M-1 changes 591's order (peer lookup before its admission): an unknown peer name to a closed run now answers the peer refusal, not CLOSED. FU-007 is a product decision.

### IR-005 — One order on the node path, one owner of RF-14, saved Task files travel (SR-010, SR-011)

- Triggering role, report path, and round: Code Reviewer, `code-review-report.md` CRR-008 (Fail, round 4, full re-audit at IR-004); the Solution Designer's SR-010 (`design-spec.md` § Revision SR-010) and SR-011 (the existing-copy bullet), reviewed in ARCH-REV-003 and ARCH-REV-004.
- Triggering finding IDs: CR-587-01 (Design Impact), CR-587-02, CR-587-03, CR-587-04 (Local Fix); DEC-009 (FU-007 decided by the founder); AR-008 (SR-011). CR-587-05 (the 461 contract model) is API/E2E's, not this round.
- Classification: `Design Impact` (implemented per SR-010 / SR-011) and `Local Fix` (CR-587-02 … 04).
- Prior authoritative result: IR-004 with CRR-008 Fail.
- Current authoritative result: SR-010 R1–R4 and SR-011 implemented (07b4b83cef; two-server test fixes e2a95cfc39); both typechecks, the whole server unit suite, the integration set and the gated two-server E2E on a rebuilt server pass.
- Related solution revision IDs: SR-010, SR-011
- Related architecture-review revision IDs: ARCH-REV-003, ARCH-REV-004
- Related code-review revision IDs: CRR-008
- Related API/E2E revision IDs: N/A (API-REV-004 was on IR-003)
- Related delivery revision IDs: N/A
- Why this implementation revision is recorded: the reviewed design changed (one order on the node path, one owner of RF-14, a saved Task's files travel, `node` on the existing-copy form); IR-004's merge decisions M-1, M-2 and M-4 are replaced by it.
- Approved behavior or requirement IDs affected: RF-3 (DEC-009 exception), RF-14 (every form, SR-011), REQ-001, REQ-003, REQ-006, REQ-009; AC-010, AC-012; DS-001, DS-002, DS-005.
- Implementation delta:
  - R1 (CR-587-01): the router's `node` path: peer → `PeerRunNodes.check` → `OutgoingFiles.send` → `admitPeerRun` (now answers `reopened` after a reopen) → `deliverMessageToPeerRun` with the descriptors → after a reopen a refused delivery gets `notDeliveredAfterReopen` (exported from CrossRun). `RemoteMessageSend` loses `outgoing` and the mismatch check; it takes `files`; a link applies only on its own node. `PeerRunMessageInput` / `PeerRunMessage` carry `files`. Without `node`, the router calls no admission: the node rule already refused any run known on a peer.
  - R2: `PeerRunNodes` (`agent-collaboration/execution/remote/peer-run-nodes.ts`): `nodeOf` (the sender root's `remoteNodeOf` through the root boundary, then the tree's Task entries) and `check` (`NODE_REQUIRED`, `NODE_MISMATCH`, `NODE_NOT_PAIRED`; `localTarget` for SR-011). `RemoteRunChannel.registeredPeerName` (PeerClient). Removed: the roots' `deliverExact` remote branches (the Team and Org roots now call `deliverToRunId` directly; the standalone `deliverExact` keeps its own-agent answer), `peerRunNodeRefusal`, CrossRun's `peerName`, `route`'s RF-14 refusal (back to 591's "not this route's").
  - R3 (DEC-009) and SR-011: `RemoteDelegation` no longer refuses `task_id`; `toPeerRun` passes `taskContextFiles` for a saved Task and sends `work.delegation.text` as the packet (the dead `description` of the remote placement removed). `toExistingRun`: `node` on `AssignToExistingDelegatedRunInput` and the parser; `PeerRunNodes.check` first (a local copy with `node` → `NODE_MISMATCH` naming this node); the Task-side read-only checks; then `OutgoingFiles.send` with `taskContextFiles`; then `assignExistingTaskExecution`; then the notice and the message with `files`; `filesSent` in the result. `savedTaskFiles` and `REMOTE_ROOT_REFUSAL_TEXT.savedTask` removed. `delegate_task` texts: mode (2) with `node`, mode (3) takes `node` for a task agent on another node; the run-ID field texts.
  - R4: CR-587-02 (`REFERENCE_FILE_REFUSAL_TEXT.inTransit`); CR-587-04 (`OutgoingFiles.open`: open once, `fstat`, `realpath` + `stat`, same `dev`/`ino`, then containment; `O_NONBLOCK`).
  - Docs: `remote_collaboration.md`, `agent_communication.md`, `agent_tools.md`, `collaboration_model.md` (CM-11, CM-14).
  - Tests: new `peer-run-nodes.test.ts` (replaces `remote-message-routing.test.ts`, whose subject, the roots' remote branch, is gone); router order (R1, "open again"); `RemoteMessageSend` without upload; `OutgoingFiles` (DEC-009 exception, dev/ino, FIFO, in-transit); `TaskDelegation` existing copy on another node (order, refusals, no upload on a Task-side refusal); in-process AC-012 (Agent new copy; Team new copy and existing copy), R1 (a refused file reopens nothing); 591's cases giving a saved Task to a remote copy name its node; the two-server file: those calls name `node`, RC-09 and RC-23 no longer expect the saved-Task refusal, row 13's senders without `node` get `NODE_REQUIRED`.
- Changed files or areas: 07b4b83cef, e2a95cfc39 (two-server RC-26, RC-52, RC-54 follow SR-010/011: IMP-22 found them, cause test-side).
- Local validation and result: IMP-19 both typechecks at baseline (server 1000 in 313 files, web 86 in 36); IMP-20 whole server unit suite (`Test Files  1060 passed | 5 skipped (1065)`, `Tests  8821 passed | 9 skipped (8830)`); IMP-21 integration (18 files, 116 tests); IMP-22 rebuild and two-server E2E: 3 test-side failures (RC-26 pinned the old node text; RC-52 and RC-54 gave a saved Task / a message to a remote copy without node); IMP-23 after the fix: 59/59. All on 07b4b83cef / e2a95cfc39.
- Next recipient or routing: Code Review (Large / High).
- Remaining limitations or risks: a non-assigner whose peer run's Tasks are all closed uploads its files before CLOSED (the review's known cost; the bytes are swept after 24 h); row 13's senders without `node` now get `NODE_REQUIRED` before CLOSED; `task-delegation.ts` is at 498 non-empty lines; the roots still take the host's `RemoteFiles` bundle though they use only its `received` part now.

### IR-006 — `remoteNodeOf` required; roots take `ReceivedFilesPlacement` (CRR-009)

- Triggering role, report path, and round: Code Reviewer, `code-review-report.md` CRR-009 (Fail, full re-audit at IR-005); the Solution Designer's decision of it (`solution-revision-record.md` § SR-012, commit 1d0a036bf4).
- Triggering finding IDs: CR-587-06, CR-587-07. CR-587-08 (security, Requirement Gap) was decided as DEC-010 (c): accepted and recorded, no behavior or design change, nothing to build. The recommended read-only closed pre-check before the upload was not taken (SR-010 R1's order stays). CR-587-05 stays with API/E2E.
- Classification: `Local Fix`.
- Prior authoritative result: IR-005 with CRR-009 Fail.
- Current authoritative result: CR-587-06 and CR-587-07 fixed (a0c233492b), no behavior change; both typechecks, the whole server unit suite, the integration set and the gated two-server E2E on a rebuilt server pass.
- Related solution revision IDs: SR-012
- Related architecture-review revision IDs: N/A
- Related code-review revision IDs: CRR-009
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this implementation revision is recorded: two local findings on IR-005's structure.
- Approved behavior or requirement IDs affected: none (no behavior change).
- Implementation delta:
  - CR-587-06: `ActiveRootMessageBoundary.remoteNodeOf` is required; `ActiveCollaborationRootDirectory.reserve` refuses a boundary without it (as it does without `ownsAgentRun`); `PeerRunNodes.nodeOf` calls it with no `?.`/`??` fallback. The three roots already implement it; the test doubles declare it (`remoteNodeOf: () => null`, no links).
  - CR-587-07: the standalone root, its builder, `RootTeamRun`, the Team materializer and manager, `AgentOrgRun` (options), the Org scope builder, and the application platform (runtime, kernel contracts) take `receivedFiles: ReceivedFilesPlacement` instead of the `RemoteFiles` bundle. The supervisor's `receivedFiles` is now `ReceivedFilesPlacement & { sweep }` (one owner: the node's `ReceivedFiles`, placed by the roots and swept after a history delete); its `remoteFiles` input and check are gone. The hosts (studio, standalone application host) pass `files.receivedFiles`. `RemoteFiles` stays the host's bundle for the collaboration composition (its `outgoing` side: the router and `TaskDelegation`); its doc comment says so.
  - Tests: `NO_FILES_RECEIVED` gains `planFor` (one double for a node that receives no files); fixtures pass `receivedFiles` (`NO_REMOTE_FILES.received`, `peerFiles.receivedFiles`); the host-owner test loses its `remoteFiles` case; the standalone host lifecycle test asserts the one received-files object is the supervisor's, the platform runtime's and the collaboration bundle's `received`.
- Changed files or areas: a0c233492b.
- Local validation and result (all Pass, on a0c233492b): IMP-24 both typechecks at baseline (server 1000 in 313 files, web 86 in 36); IMP-25 whole server unit suite (`Test Files  1060 passed | 5 skipped (1065)`, `Tests  8821 passed | 9 skipped (8830)`); IMP-26 integration (18 files, 116 tests); IMP-27 rebuild and the gated two-server E2E (59/59).
- Next recipient or routing: Code Review (Large / High).
- Remaining limitations or risks: unchanged from IR-005 (known upload-before-CLOSED cost; `task-delegation.ts` at 498 non-empty lines, untouched here).

### IR-007 — Retire the `RemoteFiles` bundle (CRR-010 CR-587-09)

- Triggering role, report path, and round: Code Reviewer, `code-review-report.md` CRR-010 (Fail, round 6, full re-audit at IR-006; documents 842b39de0e, 42968684e1).
- Triggering finding IDs: CR-587-09 (left by CR-587-07's fix: the bundle's `received` side had no production reader; DESIGN.md rule 11).
- Classification: `Local Fix`.
- Prior authoritative result: IR-006 with CRR-010 Fail (CR-587-06, -07, -08 resolved there).
- Current authoritative result: CR-587-09 fixed (11b7ed5444), no behavior change; both typechecks, the whole server unit suite, the integration set and the gated two-server E2E on a rebuilt server pass.
- Related solution revision IDs: N/A
- Related architecture-review revision IDs: N/A
- Related code-review revision IDs: CRR-010
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this implementation revision is recorded: one local finding on IR-006's structure.
- Approved behavior or requirement IDs affected: none (no behavior change).
- Implementation delta: `composeRemoteFiles` returns `{ receivedFiles, outgoingFiles }`; `composeCollaboration` takes `outgoingFiles: Pick<OutgoingFiles, "send">` (the router's `node` path and `TaskDelegation`); the hosts (studio, standalone application host) pass `files.outgoingFiles`; the `RemoteFiles` type is removed from `transferred-files.ts`. Tests: `NO_OUTGOING_FILES` and `NO_FILES_RECEIVED` replace `NO_REMOTE_FILES`; `inProcessPeerFiles` returns `outgoingFiles`; `testTaskSide`'s `outgoing` is `Pick<OutgoingFiles, "send">`; the standalone host lifecycle test asserts what production passes (the same received files to the supervisor and the platform runtime; an `OutgoingFiles` to the collaboration).
- Changed files or areas: 11b7ed5444.
- Local validation and result (all Pass, on 11b7ed5444): IMP-28 both typechecks at baseline (server 1000 in 313 files, web 86 in 36); IMP-29 whole server unit suite (`Test Files  1060 passed | 5 skipped (1065)`, `Tests  8821 passed | 9 skipped (8830)`); IMP-30 integration (18 files, 116 tests); IMP-31 rebuild and the gated two-server E2E (59/59).
- Next recipient or routing: Code Review (Large / High), then API/E2E (CR-587-05 stays there).
- Remaining limitations or risks: unchanged from IR-005.
