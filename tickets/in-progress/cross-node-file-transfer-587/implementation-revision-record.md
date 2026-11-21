# Implementation Revision Record — cross-node-file-transfer-587 (autobyteus-587)

The current code and `implementation-handoff.md` remain authoritative. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer, `design-review-report.md`, round 2 (Pass) | N/A | `Initial Baseline` | SR-009, ARCH-REV-002, CRR-001 | Implemented; Code Review Pass (CRR-001, no findings); next: API/E2E |
| IR-002 | Delivery Engineer, `release-deployment-report.md` § Escalation / Reroute (DEL-03, whole unit suite after the base refresh) | DEL-03 stale tests 1–3 | `Local Fix` | CRR-001, CRR-003, API-REV-002; DR: N/A (not yet created) | Stale test fixtures given the new inputs; whole server unit suite Pass (1050 files, 8698 tests); Code Review Pass (CRR-004, no findings); next: API/E2E |
| IR-003 | Delivery Engineer, `release-deployment-report.md` § Delivery Round 2 (merge with origin/personal 6533d7be04 conflicts) | Round-2 merge conflict (3 production files, 19 test files) | `Local Fix` | CRR-004, API-REV-003, CRR-005; DR: N/A | Merged and resolved (575c4ec9ed); typechecks, whole unit suite (8764 tests), Team integration (58) and two-server E2E (55) Pass; next: Code Review |

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
