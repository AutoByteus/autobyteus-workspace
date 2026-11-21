# Implementation Revision Record — cross-node-file-transfer-587 (autobyteus-587)

The current code and `implementation-handoff.md` remain authoritative. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer, `design-review-report.md`, round 2 (Pass) | N/A | `Initial Baseline` | SR-009, ARCH-REV-002, CRR-001 | Implemented; Code Review Pass (CRR-001, no findings); next: API/E2E |

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
