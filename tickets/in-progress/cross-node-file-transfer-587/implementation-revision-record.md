# Implementation Revision Record — cross-node-file-transfer-587 (autobyteus-587)

The current code and `implementation-handoff.md` remain authoritative. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer, `design-review-report.md`, round 2 (Pass) | N/A | `Initial Baseline` | SR-009, ARCH-REV-002, CRR-001 | Implemented; Code Review Pass (CRR-001, no findings); next: API/E2E |
| IR-002 | Delivery Engineer, `release-deployment-report.md` § Escalation / Reroute (DEL-03, whole unit suite after the base refresh) | DEL-03 stale tests 1–3 | `Local Fix` | CRR-001, CRR-003, API-REV-002; DR: N/A (not yet created) | Stale test fixtures given the new inputs; whole server unit suite Pass (1050 files, 8698 tests); Code Review Pass (CRR-004, no findings); next: API/E2E |

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
