# Design Spec — cross-node-file-transfer-587 (autobyteus-587)

## Solution And Approval Basis

- Current solution revision ID: `SR-009` (ARCH-REV-001 AR-001 … AR-006 and residuals; AR-001 decided by the founder, DEC-007 (a))
- Approved requirements: `requirements-doc.md` SR-005 with its behavior-defining supplement `reference-files-contract.md` (RFC-001), approved by the founder 2026-11-21 (DEC-001 … DEC-003, DEC-006 and the contract in his words; DEC-004, DEC-005 by the Solution Designer, confirmed by him).
- User approval of the design: the founder, 2026-11-21, delegated it: "validate each use case based on your data flow spine … which follows the design principles, and then you just send for review by yourself". Validation: § Design Validation Walkthrough; then independent architecture review.
- Design status: `Ready`
- Investigation notes: `investigation-notes.md` (§ Architecture Investigation Findings).
- Authorities read: `references/architecture-design.md`, `references/design-principles.md` (in full, this conversation); `DESIGN.md` (root, unchanged since read); `docs/design-cases.md` (incl. the base's new Case 24 and the 572 addition, read 2026-11-21); `TESTING.md` (base diff read); `collaboration_model.md`, `remote_collaboration.md`, `node_access_model.md` (NA-9). All code read at the committed base `fbe714f8bb` (Case 5).
- Conflicts: None.

## Current-State Read

- **Refusals today:** `delegate_task` with `node` refuses files (`remote-delegation.ts:44`); a message to a remote endpoint refuses them (`root-communication-engine.ts:180`), and both remote message steps record `referenceFiles: []` (`:189`, `:237`).
- **Delegation order:** `TaskDelegation.toPeerRun` (`task-delegation.ts:147-199`): prepare work → `channel.startDelegatedRun` → Task link → `channel.deliverMessage(work_packet)`; a failed packet marks the execution failed. The receiving root builds the packet (`standalone-root-message-delivery.ts:162`, `referenceFiles: []`).
- **Messages across nodes:** linked endpoints (`remote-run-links.ts`) or the `node` path (autobyteus-492/565: router → `deliverToPeerRun` → `RemoteMessageSend.sendToPeerRun` → `prepareRemoteSend` → `RemoteRunLinks.deliver` → `commitSentToRemote`; receiver `RemoteMessageReceiver` → root `acceptRemoteMessage`/`acceptPeerRunMessage` → `acceptFromRemote`). A linked run's ID routes without `node` today (CM-11).
- **Peer requests:** signed, body hash checked after parsing (`node-access-plugin.ts:69-92`). **Precedent:** Memory Sync stages files by SHA-256 in 8 MiB `PUT` pieces with `offset`, verifies, places by rename, sweeps (`api/rest/memory-sync.ts:66-128`, `memory-hub-staged-file-store.ts`).
- **Folders:** memory is always `<data>/memory` (`app-config.ts:333-335`); agent folders per root kind (`agent-memory-layout.ts:134-175`); a run's workspace from `config.workspaceId` via `WorkspaceManager.getWorkspaceRootPathForHistory` (`workspace-manager.ts:213`).
- **Runtimes:** Claude SDK per-server `timeout` (`sdk.d.ts:565-568`); Codex per-server `tool_timeout_sec` (our materializer sets only `startup_timeout_sec`); AutoByteus native: no limit; AGY/Grok/ACP: unknown.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Large` — sender validation and upload, two new peer routes, a new node-level received-files owner with placement and cleanup, both tools' remote paths, the three root kinds' accept steps, RF-14 routing changes, runtime timeouts, docs.
- Architectural risk: `High` — inter-node contract change, new persisted data (`<data>/received_files`, per-agent `received_files/`), a security boundary (files leaving a machine), a changed message rule (CM-11), deletion semantics.
- Escalation trigger: a peer request that must bypass the gate's body check; a need to store transfer state beyond the `.partial` files; any change to same-node `reference_files`.

## Intended Change

Realize RFC-001: files attached to a cross-node message or delegation are validated (workspace only), uploaded once per content in signed pieces into the receiving node's `<data>/received_files/`, placed as read-only hard links into the receiving agent's `received_files/<sender's run ID>/<name>`, and named in the recipient's message by those paths; every cross-node send names its node.

## Change Scope (Mandatory)

- In scope: UC-001 … UC-004; RFC-001 RF-2 … RF-14.
- Derived consumers:

| Changed structure / rule | Consumer | Decision |
| --- | --- | --- |
| Remote message and work-packet request (+ `files`) | `PeerClient` strict readers, `PeerGateway` parsers | New optional-by-kind field; one release (DESIGN.md rule 9) |
| Message-log lines of remote messages (now with `referenceFiles`) | message-log reader (tolerant), Messages views (565), reference content route | Paths are ordinary strings; views open them; no migration |
| CM-11 "follow-ups never name the node" | `collaboration_model.md`, `remote_collaboration.md`, tool descriptions, prompt wording, the 492 not-running hint | Rewritten to RF-14 |
| `send_message_to` / `delegate_task` results | tool contracts (`files_sent`) | Added |
| Run history delete | three delete owners | After a delete commits, the received-files cleanup runs |
| Agent folders gain `received_files/` | Memory Sync export (`local-memory-export-scanner.ts:25-79`, `memory-sync-path-policy.ts:3-7`: every regular file of `memory/agents` and `memory/agent_teams` except temporary/lock files) | The founder's DEC-007 (AR-001): Memory Sync's path policy skips every path with a `received_files` segment (one rule in `memory-sync-path-policy.ts`, read by the scanner); AC-011 |
| Docs | `collaboration_model.md` (CM-14, CM-11), `remote_collaboration.md`, `agent_communication.md`, `agent_tools.md`, GLOSSARY (received files), settings doc (`AUTOBYTEUS_RECEIVED_FILE_MAX_MB`) | Updated |

- Left alone: same-node `reference_files` (RF-1); Memory Sync except its path policy (DEC-007); context-file uploads; NFS.
- Follow-ups: None yet.

## Relevant Behavior And Production-Path Map (Mandatory)

| BEH / Contract | REQ / AC | Trigger | Spine |
| --- | --- | --- | --- |
| BEH-001, route 4 | REQ-001…006; AC-001, 003…006 | `delegate_task(node, reference_files)` | DS-001 |
| BEH-002, routes 5–6 | REQ-001…006, 009; AC-002, 010 | `send_message_to(node, …, reference_files)` | DS-002 |
| RF-7 … RF-10 | REQ-003, 007; AC-001, 007 | accept on the receiving node; history delete | DS-003, DS-004 |
| RF-14 | REQ-009; AC-010 | a cross-node send without or with the wrong `node` | DS-005 |

## Task Design Health Assessment (Mandatory)

- Change posture: `Feature` (+ a rule change, RF-14). Current design issue found: `No` for the existing owners; the feature adds owners.
- Triggers:
  - **Several kinds or forms (P1):** two tools; message by link or `node`; three receiving root kinds; Agent and Team targets. Entry-form table below.
  - **Repeated coordination (P13):** validate → hash → ask → upload is needed by delegation and by messages. One owner, `OutgoingFiles`, called by both.
  - **Capability reuse (P4):** the piece protocol and verification follow Memory Sync; `hashFile` (`memory-sync-file-hash.ts`) is reused. A shared staging core with Memory Sync is not extracted: its stores differ in identity (per source vs per node), placement (manifest targets vs agent folders) and cleanup (batch commit vs link count) (P11 "Where it bends").
  - **Persisted-data transition (P5):** new data only; decision below.
  - **Split sequence (Case 1):** the remote send keeps one owner of its order: `RemoteMessageSend` calls `OutgoingFiles.send` before `prepareRemoteSend`/`deliver`; `TaskDelegation.toPeerRun` calls it before `startDelegatedRun`. No callback is passed.
  - **Behavior by absence (P13):** RF-14 refusals are explicit results (`NODE_REQUIRED`, `NODE_MISMATCH`), not "not found".
- Deviations: None. Root cause: `No Design Issue Found` (new capability). Refactor needed now: `No`, beyond replacing the two refusals and CM-11's routing.

## Terminology

As RFC-001 § 1. **File descriptor:** `{sha256, size, name}` naming one transferred file in a request. **Placement:** making the agent-folder name for a stored file.

## Legacy Removal Policy (Mandatory)

- Removed: the two attachment refusals (`remote-delegation.ts:44`, engine `:180` and `REMOTE_ROOT_REFUSAL_TEXT.attachments`, `REMOTE_REFUSAL.ATTACHMENTS_NOT_SUPPORTED` if no reader remains); the forced `referenceFiles: []` on remote lines (`:189`, `:237`) and in `acceptRemoteWorkPacket`; linked routing without `node` (CM-11) and the 492 "not running … also pass node" hint where the node is known (replaced by `NODE_REQUIRED`).
- Compatibility paths kept: `None`.

## Persisted Data / State Transition Decision (Mandatory)

- New stored data: `<data>/received_files/<sha256>` (+ `.partial`) and per-agent `memory/…/received_files/<sender run ID>/<name>`. No existing file changes shape.
- Remote message lines now carry `referenceFiles` (sender's or received paths): the field exists and is validated today (absolute normalized paths, `collaboration-communication-message-schema.ts`); released readers read it.
- Decision: `Not Affected` for existing data; new data only. Deletion: with the run folder (existing history delete) plus the cleanup (link count).

## Data-Flow Spine Inventory

| Spine | Scope | Start | End | Owner |
| --- | --- | --- | --- | --- |
| DS-001 | Primary | `delegate_task(node, files)` | Work packet with received paths on B | `TaskDelegation.toPeerRun` (A), root accept (B) |
| DS-002 | Primary | `send_message_to(node, files)` | Message with received paths on B; both logs | `RemoteMessageSend` (A), root accept (B) |
| DS-003 | Primary (inbound transfer) | status / `PUT` piece | File complete in `<data>/received_files/` | `ReceivedFiles` (B) |
| DS-004 | Bounded | history delete commits; server start | Unlinked bytes and old `.partial` removed | `ReceivedFiles.sweep` |
| DS-005 | Primary (rule) | a cross-node send | Refused `NODE_REQUIRED` / `NODE_MISMATCH`, or routed | router + `RemoteMessageSend` |

## Primary Execution Spine(s)

- DS-001: `delegate_task tool → RemoteDelegation.delegate → TaskDelegation.toPeerRun → OutgoingFiles.send(sender, peer, files) [validate RF-3 → hash → channel.receivedFilesStatus → channel.putReceivedFilePiece… → descriptors] → channel.startDelegatedRun → Task link → channel.deliverMessage(work_packet + files) → (B) PeerGateway → RemoteMessageReceiver → root.acceptRemoteWorkPacket [link check → ReceivedFiles.verify → readyHost → ReceivedFiles.placeFor(agentFolder, senderRunId, descriptors)] → work packet with received paths → host input`
- DS-002: `send_message_to tool → Router.deliver(node) → root.deliverToPeerRun → RemoteMessageSend.sendToPeerRun → OutgoingFiles.send → engine.prepareRemoteSend (sender's paths kept) → RemoteRunLinks.deliver (+ files) → (B) PeerGateway → RemoteMessageReceiver → root.acceptRemoteMessage | acceptPeerRunMessage [ReceivedFiles.verify] → engine.acceptFromRemote [open → current receiver → Task scope → content → reservation → port.placeReceivedFiles → input with received paths → log commit] → answer → (A) engine.commitSentToRemote (sender's paths)`
- DS-003: `PeerClient.putReceivedFilePiece → [signed; gate hashes the ≤ 8 MiB body] → PeerGateway.receivedFilePiece → ReceivedFiles.appendPiece(peer, sha256, offset, size, bytes) → on the last piece: verify size + SHA-256 → rename <sha256>.partial → <sha256>`
- DS-004: `history delete (agent / team / org owner) commits → ReceivedFiles.sweep() → for each <data>/received_files/<sha256>: stat nlink === 1 and last touched more than 24 h ago → remove; each .partial older than 24 h → remove` (also at server start). `status` and a completed `PUT` touch the entry (mtime), so a file whose message is still uploading its other files, or one deduplicated for a call in flight, is never removed (AR-003; a call lasts at most about 27 min).
- DS-005 (G-3: owners as the code routes): no `node`, target is a linked endpoint of the sender's root → the root's `deliverExact` (router step 1 reaches it because `hasAgentExecution` includes remote endpoints) refuses `NODE_REQUIRED` naming `peerName(endpoint.reference.nodeId)`; no `node`, target is a peer run the tree knows (Task entry with `nodeId`) → `CrossRunMessageDelivery.route`'s peer-run branch, after `peerRunAdmission`, refuses `NODE_REQUIRED` with that node; `node` given and the sender's root links the target on another node → `RemoteMessageSend.sendToPeerRun` refuses `NODE_MISMATCH`; `node` given and the tree's Task entry puts the run on another node → the router's `node` step asks `CrossRunMessageDelivery.peerRunAdmission({node, agentRunId})` (the former `closedPeerRunRefusal`, AR-005), which answers `TASK_AGENT_RESOURCE_CLOSED` or `NODE_MISMATCH` with the right node or nothing; otherwise as 492 (an unknown run ID with no `node`: today's not-running text).

## Spine Narratives (Mandatory)

| Spine | Narrative | Owner |
| --- | --- | --- |
| DS-001 | Files are validated and uploaded before the peer starts the run, so a failed transfer leaves nothing on B but swept `.partial`s; the work packet names the files; B places them for the entry agent and lists the received paths. | `TaskDelegation` |
| DS-002 | The same upload owner runs first; the sender's log keeps its own paths; B places and records received paths in one accept step. | `RemoteMessageSend` |
| DS-003 | Pieces append to `<sha256>.partial` at the stated offset; the last piece is verified and renamed; status answers what is held and the node's limit. | `ReceivedFiles` |
| DS-004 | A stored file whose only name is its own is unused and removed; nothing else expires. | `ReceivedFiles` |
| DS-005 | Every cross-node send names its node; the node the server knows for a linked run is the authority for the refusal text. | router / `RemoteMessageSend` |

## Ownership Map

- **`OutgoingFiles`** (new, `agent-collaboration/execution/remote/outgoing-files.ts`): RF-3 validation, done on the opened file: the validated real path is opened once, and the hash and every piece are read from that descriptor (no second path lookup; residual) (workspace from the sender's active run: `config.workspaceId` → `WorkspaceManager.getWorkspaceRootPathForHistory`; `fs.realpath` of file and workspace; containment; regular file), RF-4 limits (receiver's `maxFileBytes` from status; 4 GiB total), SHA-256 (`hashFile`), RF-11 status/resume, piece upload (8 MiB), refusals of § 5; returns descriptors `{sha256, size, name}`. Called by `TaskDelegation.toPeerRun` and `RemoteMessageSend.sendToPeerRun` before anything else is sent.
- **`ReceivedFiles`** (new, `remote-collaboration/inbound/received-files.ts`): `<data>/received_files/`: `status(files)`, `appendPiece` (offset check, per-file limit, `.partial`), verify-and-complete, `placeFor(agentFolder, senderRunId, descriptors)` (safe name; temp link then atomic rename over an existing same-named file; `chmod 0444`; hard link, else copy), `sweep()` (unlinked and untouched for 24 h). An offset that does not match the bytes held answers `{receivedBytes}` without writing, and the sender resumes from there (concurrent uploads of one content; residual). Paths are confined with the existing containment helper pattern (`resolveSafeChildPath`).
- **Order on the receiving node (AR-002), one driver each:**
  - **Message:** the root's accept step only checks that every named file is complete in `<data>/received_files/` (`ReceivedFiles.verify`, no writes; else `REFERENCE_FILE_CHECK_FAILED`) and passes the descriptors to the engine. `RootCommunicationEngine.acceptFromRemote` drives the rest in its existing order: open, current receiver, Task scope (`assertDeliveryAllowed`), content, recipient reservation; **then** places (through its port: `RootCommunicationPort.placeReceivedFiles(receiverIdentity, senderRunId, descriptors)` → the root's `ReceivedFiles.placeFor` with the receiver's own folder), then builds the input with the received paths and commits the log line. Every refusal that can come from the message's admission comes before any file is placed or replaced. A failure of the log append itself after placement (I/O) is the only case left; the new name then stays (a file the sender meant to send) and the message is not delivered — recorded as a residual risk.
  - **Work packet:** the root's `acceptRemoteWorkPacket` checks the link (as today) and `verify`, makes its host ready (`readyHost`), **then** places, then posts the packet with the received paths.
  - Placement is a port method the engine calls in its own sequence, not a function passed per call (Case 1).
- **Engine:** `prepareRemoteSend` keeps the sender's `referenceFiles`; `acceptFromRemote` takes the received paths. Order unchanged.
- **Remote input builder (G-1):** `buildRemoteCommunicationInputMessage` (`root-communication-runtime-builder.ts:50-75`) today has no "Reference files:" block and sets `reference_files: []`; it uses the same block as `buildRootCommunicationInputMessage` (`:23-24`, one helper for both) and passes the received paths in `reference_files`.
- **Peer signing (G-2):** `signPeerRequest` takes `body: string | Buffer | null` (`peer-request-signature.ts:67-73`; `sha256Hex` already accepts a Buffer); `PeerClient` gets one raw-body call beside its JSON `call` (`peer-client.ts:370-409`).
- **Router / `RemoteMessageSend`:** RF-14 refusals (DS-005).
- **`PeerClient` / `PeerGateway` / `remote-requests.ts`:** two routes (status JSON; piece `application/octet-stream`, `bodyLimit` 8 MiB + headroom, per-request time bound 120 s for pieces), `files` on four existing requests, strict readers.
- **Runtime materializers:** Codex `tool_timeout_sec: 3600` and Claude `timeout: 3_600_000` on the `autobyteus_agent_tools` server (a 4 GiB transfer at 20 Mbit/s ≈ 27 min).

## Removal / Decommission Plan (Mandatory)

| Item | Why | Replaced By |
| --- | --- | --- |
| `remote-delegation.ts:44` refusal; `REMOTE_ROOT_REFUSAL_TEXT.attachments` | Files allowed | `OutgoingFiles` |
| Engine `:180` refusal; forced `[]` at `:189`, `:237`; `acceptRemoteWorkPacket` `referenceFiles: []` | Files allowed | sender/received paths |
| Linked routing without `node` (root `deliverExact` for a remote endpoint), the 492 hint when the node is known | RF-14 | `NODE_REQUIRED` / `NODE_MISMATCH` |
| `REMOTE_REFUSAL.ATTACHMENTS_NOT_SUPPORTED` | Dead once both refusals go (verify readers) | — |
| `RemoteMessageSend.send` and `RemoteMessageSendInput` | Dead under RF-14: their only callers are the roots' `deliverExact` remote branches (`standalone-root-message-delivery.ts:117`, Team `:73`, Org `:68`), which now refuse `NODE_REQUIRED` (AR-004) | `sendToPeerRun` (the `node` path) |

## Interface Boundary Mapping

| Interface | Shape |
| --- | --- |
| `RemoteRunChannel.receivedFilesStatus(nodeId, files[{sha256,size}])` | `{maxFileBytes, files[{sha256, receivedBytes, complete}]} \| refusal` |
| `RemoteRunChannel.putReceivedFilePiece(nodeId, sha256, offset, size, bytes)` | `{receivedBytes, complete} \| refusal` |
| `RemoteMessageTransmission` / start / work packet / `run-messages` | `+ files?: FileDescriptor[]` |
| `OutgoingFiles.send({sender, nodeId, peerName, referenceFiles})` | `{ok: true, files: FileDescriptor[]} \| {ok: false, refusal}` |
| `ReceivedFiles.placeFor({agentFolder, senderRunId, files})` | `{ok: true, paths: string[]} \| {ok: false, code: "REFERENCE_FILE_CHECK_FAILED", file}` |
| Tool results | `delegate_task` / `send_message_to` + `files_sent: n` when > 0 |
| Setting | `AUTOBYTEUS_RECEIVED_FILE_MAX_MB` (default 2048) |

## Concrete Examples / Shape Guidance

Entry forms:

| # | Form | Files | Routing |
| --- | --- | --- | --- |
| 1 | `delegate_task(node)` → Agent | uploaded, placed in the new agent's folder | as 191 |
| 2 | `delegate_task(node)` → Team | placed in the coordinator's folder | as 247 |
| 3 | `send_message_to(node)` → unlinked running agent | placed in its folder | 492 |
| 4 | `send_message_to(node)` → linked remote run (delegator → copy, copy → delegator, a member of a remote Team) | placed in the receiving agent's folder | link if paired, else unlinked (492) |
| 5 | form 4 without `node` | — | `NODE_REQUIRED` |
| 6 | form 4 with another node's name, from the linking root | — | `NODE_MISMATCH` (`sendToPeerRun`) |
| 6b | a run the tree knows on another node, with another node's name, from a root that does not link it | — | `NODE_MISMATCH` with the right node (`peerRunAdmission`, AR-005) |
| 7 | same-node message or delegation with files | unchanged (RF-1) | unchanged |
| 8 | any cross-node form with a file outside the workspace / folder / too large / no workspace | nothing sent | § 5 refusal |

## Design Validation Walkthrough (SR-007)

Each use case along its spine, every premise read at the committed base `fbe714f8bb` (`git show HEAD:…`).

| UC / Spine | Step | Evidence | Result |
| --- | --- | --- | --- |
| UC-001 / DS-001 | Upload before the peer starts the run | `toPeerRun` order `task-delegation.ts:147-199`; `placement.peer.nodeId` available | Holds |
| UC-001 / DS-001 | Sender's workspace | active run `config.workspaceId` (`agent-run-config.ts:10`) → `getWorkspaceRootPathForHistory` (`workspace-manager.ts:213`) | Holds |
| UC-001 / DS-001 | Packet fails on B after files arrived | `markFailed` (`task-delegation.ts:187-191`); the prepared run without a packet is removed at the next start (`remote_collaboration.md`) | Holds; `.partial`s and unlinked bytes swept |
| UC-001 / DS-001 | B lists received paths in the packet | `acceptRemoteWorkPacket` builds the packet with `referenceFiles: []` (`standalone-root-message-delivery.ts:162`); the packet builder takes `referenceFiles` | Holds (pass received paths) |
| UC-002 / DS-002 | Sender keeps its paths in its log | `prepareRemoteSend` sets `[]` (`root-communication-engine.ts:189`); schema accepts absolute normalized paths | Holds (keep them) |
| UC-002 / DS-002 | Recipient sees the paths | Remote builder has no block (`root-communication-runtime-builder.ts:50-75`) | **G-1**: added (Ownership Map) |
| UC-002 / DS-002 | Receiver's log | `acceptFromRemote` forces `[]` (`:237`) | Holds (received paths) |
| UC-003 / DS-002 | Reply copy → delegator | B's root `delegator` endpoint; `deliverExact` | Holds with RF-14 (`node`) |
| DS-003 | Piece body checked by the gate | `preParsing`/`preValidation` (`node-access-plugin.ts:69-92`); buffer parser per scope as Memory Sync (`memory-sync.ts:66-75`) | Holds |
| DS-003 | Signing a raw piece | `signPeerRequest` body `string \| null` (`peer-request-signature.ts:67-73`); JSON-only `call` (`peer-client.ts:370-409`) | **G-2**: raw body added |
| UC-004 / DS-004 | Cleanup after delete | delete owners (`agent-run-history-service.ts:250`, `team-run-history-service.ts:122`, `agent-org-run-history-catalog-service.ts:115`); `fs.stat().nlink` | Holds |
| UC-004 / DS-004 | Received file opens in Messages | content route refuses only on `EACCES` (`agent-org-reference-content-service.ts:37-42`); read-only files are readable | Holds |
| RF-14 / DS-005 | Where the refusal is made | router step 1 → root (`hasAgentExecution` incl. remote endpoints); CrossRun peer-run branch | **G-3**: owners named |
| RF-6 | Tool-call limits | Claude `timeout` (`sdk.d.ts:565-568`); Codex `tool_timeout_sec`; AutoByteus none; AGY/Grok/ACP unknown | Holds; risk recorded |

Principles: P1 (entry forms, table above), P2/P13 (one owner per sequence; `OutgoingFiles` for both tools; no callbacks), P4 (Memory Sync pattern, `hashFile` reused), P5 (new data only), P7/P8 (removals listed), P10 (explicit descriptors and results), P11 (derived consumers listed), P15 (vocabulary from RFC-001; `received_files` at two levels, one meaning), P16 (owners built in the composition with their collaborators: `OutgoingFiles` ← workspace manager, run manager, channel; `ReceivedFiles` ← data folder, layout).

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Decision |
| --- | --- |
| Keep linked routing without `node` beside RF-14 | Rejected (founder, DEC-006) |
| One-request streaming bypassing the gate's body hash | Rejected: security boundary (NA-9) |
| Base64 files inside JSON | Rejected (Task) |

## Change / Refactor Sequence

1. `ReceivedFiles` + the two peer routes + `PeerClient` methods; unit tests (offset, limit, verify, rename, place/replace, read-only, sweep by link count).
2. `OutgoingFiles` + its refusals; unit tests (workspace containment incl. symlinks, folder, size, total, resume, skip).
3. Messages: `RemoteMessageSend` + engine + roots' accept + `files` on `messages`/`run-messages`.
4. Delegation: `TaskDelegation.toPeerRun` + work packet `files` + roots' `acceptRemoteWorkPacket`.
5. RF-14 (router, `RemoteMessageSend`, roots' `deliverExact`), texts, results `files_sent`.
6. Memory Sync path policy skips `received_files/` (DEC-007); history delete → `sweep`; startup sweep; setting; runtime timeouts (Codex, Claude); measure AGY/Grok/ACP limits with a slow stub tool and record them.
7. Docs (CM-14, CM-11 rewrite, modules, glossary, settings); two-server E2E with `.mp4`/`.pdf`/`.png` (AC-001 … AC-007, AC-010), a tampering proxy (AC-003), a stopped peer (AC-006), history delete (AC-007).

## Key Tradeoffs

- Bounded signed pieces over one stream: keeps NA-9 unchanged; ~8 MiB per request.
- Link-count cleanup over a reference index: no new state; the OS keeps the count.
- Upload before start/delivery: a failure leaves only `.partial`s, swept in 24 h.

## Risks

- Runtimes without a configurable tool-call limit (AGY, Grok, ACP): a long transfer may be cut by their default; the call then fails cleanly (all or nothing). Measured in implementation (AC-009).
- Both nodes need the release (DESIGN.md rule 9).
- A log append that fails after placement leaves a placed file without its message (AR-002 residual; I/O failure only).
- AGY/Grok/ACP tool-call limits accepted unverified (DEC-008).
- The node's disk fills: the receiver's per-file limit and the 4 GiB per call bound one transfer; disk-full is a transfer failure.

## Guidance For Implementation

- Reproduction: a two-server E2E sending a binary file today returns `REMOTE_ATTACHMENTS_NOT_SUPPORTED` / the delegation attachments refusal; the build turns it into AC-001/AC-002.
- Read all code at the committed state (Case 5, autobyteus-492 AR-008).
