# Implementation Handoff — cross-node-file-transfer-587 (autobyteus-587)

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: independent architecture review selected (Large / High); ARCH-REV-002 Pass on SR-008, spine wording SR-009 (commit 8ef1beee4b).
- Requirements doc: `tickets/in-progress/cross-node-file-transfer-587/requirements-doc.md`
- Investigation notes: `tickets/in-progress/cross-node-file-transfer-587/investigation-notes.md`
- Solution revision record: `tickets/in-progress/cross-node-file-transfer-587/solution-revision-record.md`
- Design spec (required on every route): `tickets/in-progress/cross-node-file-transfer-587/design-spec.md`
- Supplemental task artifacts: `reference-files-contract.md` (RFC-001), `follow-ups.md`
- Design review report: `tickets/in-progress/cross-node-file-transfer-587/design-review-report.md`
- Architecture review revision record: `tickets/in-progress/cross-node-file-transfer-587/architecture-review-revision-record.md`
- Triggering rework report, revision record, or evidence, when applicable: `release-deployment-report.md` § Escalation / Reroute; `evidence/DEL-post-integration/DEL-03-whole-unit-suite-FAIL-stale-tests.log`

## Current Implementation Summary

Files attached to a cross-node `delegate_task` or `send_message_to` are checked on the sending node (inside the sender's workspace, links resolved, regular files, distinct names, under the receiver's per-file limit and 4 GiB per call), hashed from one open handle, and uploaded once per content in signed raw pieces of at most 8 MiB into the receiving node's `<data>/received_files/<sha256>` (`.partial` while it arrives; a held file is skipped, a partial one resumed). Only then is the run started (delegation) or the message prepared and delivered. The receiving node verifies every named file before any root sees the request; the root plans the received paths (`<agent folder>/received_files/<sender run ID>/<name>`), holds the receiver's input slot, places the files as read-only hard links (copy as fallback; same sender + same name is replaced by atomic rename), then writes the log line. Every cross-node send names its node (RF-14). Unused entries and old partials are swept after a history delete and at startup; Memory Sync skips `received_files`.

- Implementation cycle: `Rework` (IR-002, a test-only Local Fix from delivery; the implementation summary above is unchanged)
- Implementation revision record: `tickets/in-progress/cross-node-file-transfer-587/implementation-revision-record.md`
- Current implementation revision ID: `IR-002` (IR-001 is the baseline)
- Related solution revision IDs: SR-009
- Related architecture-review revision IDs: ARCH-REV-002
- Related code-review revision IDs: CRR-001, CRR-003
- Related API/E2E revision IDs: API-REV-002
- Related delivery revision IDs: N/A (delivery has not created DR-001; trigger: `release-deployment-report.md` § Escalation / Reroute)
- Triggering finding IDs: DEL-03 items 1–3 (stale tests in the whole unit suite after the base refresh)

## Routing Classification (Mandatory)

- Task size: `Large`
- Architecture risk: `High`
- Design classification section / evidence reference: `design-spec.md` § Task Size And Architectural Risk
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: the change spans a new inter-node contract (two routes, `files` on two requests, raw-body signing), new persisted data (node store and per-agent folders), a security boundary (workspace containment), a changed message rule (CM-11 → RF-14) and deletion semantics, as the design states. No escalation trigger was hit: the piece route uses the existing gate body check (scoped octet-stream parser), no transfer state beyond `.partial` files, same-node `reference_files` unchanged.
- Selected route: `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None` (deviations D-1 … D-6 below are implementation-level and listed for review)

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| DS-001 / BEH-001 / REQ-001, 003 / AC-001 | `delegate_task(node, reference_files)`: files uploaded before the peer starts the run; the work packet names received paths | A: `task/task-delegation.ts` `toPeerRun` → `OutgoingFiles.send` → `startDelegatedRun` → work packet `files`. B: `RemoteMessageReceiver` verify → root `acceptRemoteWorkPacket` (standalone, Team; Org roots receive no work packets) plan → place → post with paths (`buildTaskAssigneeWorkPacket`) | Implemented. In-process: standalone and Team tests (files on the delegation reach B read-only in the entry agent's folder). Two-server E2E with `.mp4`/`.pdf`/`.png`: API/E2E |
| DS-002 / BEH-002 / REQ-001, 003 / AC-002 | `send_message_to(node, …, reference_files)`: upload first; sender's log keeps its paths; receiver's log and input name received paths | A: `remote/remote-message-send.ts` `sendToPeerRun` (files → `prepareRemoteSend` → `deliver(…, files)` → `commitSentToRemote`). B: `RemoteMessageReceiver` verify → root accept → engine `acceptFromRemote` (`plan → reserve → place → commit`) | Implemented, both linked and unlinked runs (`messages`, `run-messages`). In-process tests both ways (standalone, Team, unrelated PMs) |
| DS-003 / REQ-002, 005, 007 / AC-003, AC-005 | Status and signed raw pieces; offset mismatch answers held bytes; size + SHA-256 on completion; per-file limit on every piece | `remote-collaboration/inbound/received-files.ts` (`status`, `appendPiece`), `channel/peer-gateway.ts` (`receivedFilesStatus`, `receivedFilePiece`, 8 MiB check), `api/rest/remote.ts` (piece scope: octet-stream parser, `bodyLimit` 8 MiB), `channel/peer-client.ts` (`RawPeerBody`, signs the bytes), `peer-request-signature.ts` (Buffer body) | Implemented. Unit: received-files, peer-gateway, peer-client (signed PUT). Tampering proxy (AC-003): API/E2E |
| REQ-004 / AC-004 | Only workspace files; links resolved; folders and `..` refused before anything is sent | `remote/outgoing-files.ts` `open` (realpath, containment, regular file) | Implemented; unit `outgoing-files.test.ts` (outside, symlink out, `..`, folder, missing) |
| REQ-005 / AC-005 | Sender checks the receiver's limit and the 4 GiB total; receiver enforces on every piece | `OutgoingFiles.transfer` (`TOO_LARGE`, total), `ReceivedFiles.appendPiece` (limit), `config/received-file-size-limit-setting.ts` | Implemented; unit tests for both sides and the setting |
| REQ-006 / AC-006 | All or nothing; the agent is told which file and why | `OutgoingFiles` refusals (`REFERENCE_FILE_TRANSFER_FAILED`, `_CHECK_FAILED`), receiver `missingFile` refusal, engine cancel on a failed placement | Implemented; unit. Stopped peer mid-transfer: API/E2E |
| DS-004 / REQ-007 / AC-007 | One copy per content; skip on re-send; sweep after history delete and at startup (nlink 1 + 24 h; `.partial` 24 h) | `ReceivedFiles.sweep`; `run-history/services/delegated-work-guard.ts` (after a successful delete); `compositions/build-studio-server.ts` (startup) | Implemented; unit: sweep, dedup touch, multi-file call during a sweep, concurrent senders; guard test. App-level history delete: API/E2E |
| RF-7 placement / AC-010 replacement | Read-only link at `<agent folder>/received_files/<sender run ID>/<name>`; same sender + name replaced atomically; another sender's kept | `ReceivedFiles.planFor` / `placeOne`; folders: standalone `receivingAgentFolder(run)`, Team `memberFolderOf` (manager's locator), Org `agentFolderOf` | Implemented; unit + in-process (replacement visible on B) |
| MP-002 (review "watch for") | A reply after the Task closed is refused; nothing placed or replaced | Engine checks Task scope before planning; placement only after the reservation | Unit (engine) and in-process (standalone): refused `TASK_AGENT_RESOURCE_CLOSED`, A's earlier file unchanged |
| DS-005 / REQ-009 / RF-14 / AC-010 | Every cross-node send names its node: `NODE_REQUIRED` without, `NODE_MISMATCH` with the wrong one | Roots' `deliverExact` remote branch (standalone, Team, Org) → `nodeRequired`; `CrossRunMessageDelivery.peerRunAdmission` (router uses it with the given node); `RemoteMessageSend.sendToPeerRun` → `nodeMismatch` | Implemented; unit (routing, CrossRun, owners) and in-process AC-010 sequence (no node, wrong node, right node) |
| AC-011 / DEC-007 | Memory Sync never exports `received_files` | `memory-sync/shared/memory-sync-path-policy.ts` (`shouldExcludeMemorySyncLeaf`) | Implemented; scanner unit test |
| AC-009 / DEC-003 | Long transfers fit the configured runtime tool-call limits | Codex `tool_timeout_sec: 3600`, Claude `timeout: 3_600_000`; AutoByteus has none | Implemented; materializer tests. AGY/Grok/ACP: FU-001 (DEC-008) |
| G-1, tool wording, results | Remote input lists "Reference files:"; reply instruction names the node; `files_sent` | `root-communication-runtime-builder.ts`, `task-execution-input.ts`, `send-message-to-tool-*`, `task-delegation-result-contract.ts`, `agent-team-collaboration-llm-contract.ts` | Implemented; contract hash tests updated |
| AC-008 | Same-node `reference_files` unchanged | not touched | Existing suites pass |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

All under `autobyteus-server-ts/` unless noted.

- New: `src/agent-collaboration/execution/remote/outgoing-files.ts`, `src/agent-collaboration/execution/remote/transferred-files.ts`, `src/remote-collaboration/inbound/received-files.ts`, `src/compositions/remote-files-composition.ts`, `src/config/received-file-size-limit-setting.ts`.
- Peer contract: `src/remote-collaboration/domain/remote-requests.ts`, `channel/peer-gateway.ts`, `channel/peer-client.ts`, `channel/peer-request-signature.ts`, `inbound/remote-message-receiver.ts`, `remote-collaboration-services.ts`, `src/api/rest/remote.ts`.
- Sending: `remote/remote-message-send.ts` (rewritten), `remote/remote-endpoint.ts`, `remote/remote-run-links.ts`, `remote/remote-run-channel.ts`, `remote/remote-refusal-codes.ts`, `remote/remote-delegation.ts`, `task/task-delegation.ts`, `task/task-delegation-command.ts`, `task/task-execution-input.ts`.
- Receiving: `communication/root-communication-engine.ts`, `root-communication-port.ts`, `root-communication-runtime-builder.ts`; standalone root, delivery, port, builder; Team `root-team-run.ts`, `team-run-message-delivery.ts`, `team-communication-port.ts`, `team-root-materializer.ts`, `agent-team-run-manager.ts`; Org `agent-org-run.ts`, `agent-org-run-options.ts`, `agent-org-communication-port.ts`, `agent-org-run-message-delivery.ts`, `agent-org-execution-scope-builder.ts`, `root-agent-execution-registry.ts`.
- RF-14: `agent-collaboration/communication/cross-run-message-delivery.ts`, `agent-communication/services/global-agent-run-message-router.ts`.
- Wiring: `general-process-run-supervisor(-input).ts`, `build-studio-server.ts`, `collaboration-composition.ts`, `remote-collaboration-composition.ts`, `start-standalone-application-host.ts`, `application-platform/*`.
- Cleanup, policy, settings, runtimes: `run-history/services/delegated-work-guard.ts`, `memory-sync/shared/memory-sync-path-policy.ts`, `services/server-settings-service.ts`, Codex and Claude agent-tools MCP materializers.
- Contracts and wording: `send-message-to-tool-contract.ts`, `send-message-to-tool-result-contract.ts`, `task-delegation-result-contract.ts`, `task-delegation-tool-serialization.ts`, `agent-team-collaboration-llm-contract.ts`, `agent-operation-result.ts`.
- Docs: `docs/design/collaboration_model.md` (CM-11 rewritten, CM-14), `docs/modules/remote_collaboration.md`, `agent_tools.md`, `agent_communication.md`, `GLOSSARY.md`, `autobyteus-web/docs/settings.md`.
- Tests (new): `received-files.test.ts`, `outgoing-files.test.ts`, `root-communication-engine-received-files.test.ts`, `local-memory-export-scanner-received-files.test.ts`, `received-file-size-limit-setting.test.ts`, helper `tests/helpers/in-process-peer-files.ts`; new in-process cases in `standalone-remote-delegation`, `team-remote-delegation`, `running-agents-messaging`, `task-delegation`; `NO_REMOTE_FILES` / `NO_FILES_RECEIVED` in `tests/helpers/explicit-host-collaborators.ts`.
- `typecheck-baseline.json`: shrunk by one (1006 → 1005) after `remote-messaging-owners.test.ts` lost a pre-existing error.

## Important Assumptions

- **Deviations from the design's wording, for review:**
  - **D-1 Plan, then place after the reservation.** The engine needs the receiver's final input (naming the received paths) to reserve the slot, so `ReceivedFilesPlacement.planFor` returns `{paths, place()}`: paths are computed first, placement runs after the reservation, and a failed or throwing placement cancels the reservation. Same order the design states (checks → reservation → placement → commit); only the split is added.
  - **D-2 One sweep trigger point.** The sweep after a history delete is in `DelegatedWorkGuard.guard` (after a successful `deleted`), the one point the Agent, Team and Org history services all delete through, instead of in each of the three owners.
  - **D-3 Verification in `RemoteMessageReceiver`.** The "files complete here" check runs once for every root, after the link and stored checks (and after the root is found, for run messages), not in each root.
  - **D-4 No files on the start request.** The delegation's files travel on the work packet only; the start request would not use them.
  - **D-5 New refusal `REFERENCE_FILE_NAME_REPEATED`.** Two files with one name in a call would land at one path; the call is refused before anything is sent.
  - **D-6 Team root memory locator.** `RootTeamRun.memoryLocator` existed but was never set, so the member folder fell back to the process memory folder. The Team manager now passes `new AgentRunMemoryLocator({ layout })` from its own memory folder through the materializer (required there). In the server both point at the same folder; an in-process two-node test exposed the difference.
- **Principle 16 note (process instance lookup).** `composeRemoteFiles` gives `OutgoingFiles` a `runs` port that reads `AgentRunManager.getInstance().getActiveRun` at send time. The run services create that manager after the remote files are composed (the gateway and roots need them first), nothing sends before the server listens, and a missing manager throws loudly; injecting it would need a cycle between the compositions.
- **AC-002 wording.** AC-002 says B's task agent messages A "linked, no `node`"; REQ-009 / RF-14 / AC-010 (later) require `node` on every cross-node send. The implementation follows RF-14; the agent's reply instruction now names the node. Solution Designer may want to correct AC-002's wording.
- The receiving agent's folder is its run's configured memory folder (standalone: the live run's `config.memoryDir`; Team member: the manager's locator and the team's placement; Org: `ownFolderOf` / the team placement).

## Known Risks

- AGY, Grok and ACP tool-call limits are unknown (FU-001, DEC-008): a long transfer may be cut by them; the call then fails cleanly.
- A log append that fails after placement leaves a placed file without its message (design's AR-002 residual; I/O failure only). Also: the append's own Task-scope recheck runs after placement, so a Task closed in the instant between the early check and the append can leave a placed (replaced) file with a refused message; narrow race, same class.
- Both nodes need this release (DESIGN.md rule 9): an older peer answers the new routes as unknown and the sender reports it unreachable.
- `origin/personal` moved to 9514a05a0e after the ticket base fbe714f8bb; integration is delivery's.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Feature` (+ RF-14 rule change)
- Reviewed root-cause classification: `No Design Issue Found`
- Reviewed refactor decision: `No Refactor Needed` (beyond removing the refusals and CM-11 routing)
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: one owner of the upload sequence (`OutgoingFiles`) called by both tools (P13); `hashFile` reused (P4); RF-14 refusals are explicit results.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed (Core Principle 7): `Yes` — `REMOTE_REFUSAL.ATTACHMENTS_NOT_SUPPORTED`, the attachments texts, `RemoteMessageSend.send`, `RemoteMessageSendInput`, `closedPeerRunRefusal` (renamed into `peerRunAdmission`), forced `referenceFiles: []` on remote lines.
- Dead code found elsewhere, added to `follow-ups.md`: None
- Shared structures remain tight: `Yes` — `files` is a separate field on the two request kinds; `TransferredFile` is one small type.
- Canonical shared design guidance was reapplied during implementation: `Yes`
- Deviations from a design principle decided during implementation: Principle 16 (process instance lookup in `composeRemoteFiles`), reasons above.
- Changed source implementation files stayed within size guardrails: `Yes` — largest: `peer-client.ts` 472, `root-team-run.ts` 470, `root-communication-engine.ts` 425 non-empty lines; no tracked source file changed by more than 120 lines; new files ≤ 201 lines.
- Notes: none.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected` for existing data; new data only.
- Design-spec decision reference: `design-spec.md` § Persisted Data / State Transition Decision
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`
- Direct-use evidence: remote message lines now carry `referenceFiles` (the existing validated field); no reader changed.
- Migration implementation: N/A
- Deviation: `None`

## Environment Or Dependency Notes

- macOS (Darwin 25.5), Node 22, pnpm; worktree `autobyteus-worktrees/cross-node-file-transfer-587`, `pnpm install --frozen-lockfile` and `prepare:source` run.
- No dependency added. No real provider key used; no test touched `~/.autobyteus` (all tests use temp folders).
- The untracked SDK `dist/` folders in the worktree are build outputs of `prepare:source`, not part of the change.

## Checks Run

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `pnpm -C autobyteus-server-ts typecheck` (after `typecheck:update-baseline` shrank 1006 → 1005) | e327ba2467 | macOS, Node 22 | server `src` and tests | all | Pass | `evidence/IMP-01-server-typecheck.log` | `[typecheck] PASS`; `production errors: 0; test-file errors: 1005 in 315 files (baseline 1005 in 315 files)` |
| IMP-02 | `pnpm -C autobyteus-web typecheck` | e327ba2467 content (run before the commit; only the AC-010 test case was added after, covered by IMP-01 and IMP-04) | macOS, Node 22 | web app, Electron main, cross-package tests compiling server `src` | all | Pass | `evidence/IMP-02-web-typecheck.log` | `[typecheck] PASS`; `production errors: 0; test-file errors: 86 in 36 files (baseline 86 in 36 files)` |
| IMP-03 | `pnpm exec vitest run tests/unit/remote-collaboration tests/unit/agent-collaboration tests/unit/agent-communication tests/unit/standalone-agent-run-root tests/unit/agent-team-execution tests/unit/agent-org-execution tests/unit/memory-sync tests/unit/agent-tools tests/unit/run-history tests/unit/agent-execution/backends tests/unit/compositions tests/unit/api tests/unit/config tests/unit/services` (in `autobyteus-server-ts`) | e327ba2467 content (as IMP-02) | macOS, Node 22 | every changed server module and its in-process two-node flows | DS-001 … DS-005, AC-001, 002, 004, 005, 007 (unit), 008, 010, 011 | Pass | `evidence/IMP-03-server-broad-unit.log` | `Test Files  471 passed \| 4 skipped (475)`; `Tests  3845 passed \| 7 skipped (3852)` |
| IMP-04 | `pnpm exec vitest run tests/unit/remote-collaboration/standalone-remote-delegation.test.ts tests/unit/remote-collaboration/team-remote-delegation.test.ts tests/unit/remote-collaboration/running-agents-messaging.test.ts tests/unit/remote-collaboration/received-files.test.ts tests/unit/agent-collaboration/execution/remote/outgoing-files.test.ts tests/unit/agent-collaboration/execution/communication/root-communication-engine-received-files.test.ts --reporter=verbose` | e327ba2467 | macOS, Node 22 | in-process two nodes (real `PeerClient`, `PeerGateway`, receivers, roots, stores, `OutgoingFiles`/`ReceivedFiles`; HTTP and the gate's signature check replaced), engine file order, both new owners | AC-001, AC-002, AC-004, AC-005, AC-007 (unit), AC-010, MP-002 | Pass | `evidence/IMP-04-files-in-process.log` | `Tests  51 passed (51)`; the case `autobyteus-587 AC-010 (RF-14): a message to the delegated run without node, or with another node, is refused …` ✓; `… MP-002: a reply after the Task closed is refused before anything is placed …` ✓ |
| IMP-05 | Fresh-start build check for the changed build input (`typecheck-baseline.json`): `git clone --no-local` of the commit, `pnpm install --frozen-lockfile` alone, then `pnpm -C autobyteus-server-ts typecheck` and `pnpm -C autobyteus-web typecheck` | e327ba2467 | macOS, Node 22, fresh clone | the baseline file and both typecheck gates from a clean install | — | Pass | `evidence/IMP-05-fresh-start-typechecks.log` | `install exit=0`; server `[typecheck] PASS` with `test-file errors: 1005 in 315 files (baseline 1005 in 315 files)`; web `[typecheck] PASS` with `test-file errors: 86 in 36 files (baseline 86 in 36 files)` (this web run is on the commit itself) |
| IMP-06 | `pnpm -C autobyteus-server-ts test:unit` (IR-002) | e295b74b81 (on delivery's ef53fadd52; base origin/personal ecd6d4556c merged as 3be417f8df) | macOS, Node 22 | the whole server unit suite | all; AC-008 | Pass | `evidence/IMP-06-whole-server-unit-suite.log` | `Test Files  1050 passed \| 5 skipped (1055)`; `Tests  8698 passed \| 9 skipped (8707)`; `exit=0` |
| IMP-07 | `pnpm exec vitest run` the five IR-002 test files (`general-process-run-supervisor-ownership`, `standalone-application-host-lifecycle`, `application-team-input-root-dispatch`, `agent-team-run-manager-lifecycle`, e2e `recent-run-projection-graphql`) `--reporter=verbose --no-watch` | e295b74b81 | macOS, Node 22 | the supervisor, standalone host, Team root and Team manager constructions; run-history GraphQL e2e | — | Pass | `evidence/IMP-07-ir002-test-files.log` | `Test Files  5 passed (5)`; `Tests  44 passed (44)` |
| IMP-08 | `pnpm -C autobyteus-server-ts typecheck` (IR-002) | e295b74b81 | macOS, Node 22 | server `src` and tests | all | Pass | `evidence/IMP-08-server-typecheck.log` | `[typecheck] PASS`; `test-file errors: 1005 in 315 files (baseline 1005 in 315 files)` |
| IMP-09 | `pnpm -C autobyteus-web typecheck` (IR-002) | e295b74b81 | macOS, Node 22 | web, Electron main, cross-package tests | all | Pass | `evidence/IMP-09-web-typecheck.log` | `[typecheck] PASS`; `test-file errors: 86 in 36 files (baseline 86 in 36 files)` |

- Not run, and why:
  - (IR-001 left out the whole server unit suite as covered by the affected set; that was wrong: delivery's whole run found stale constructions outside it. IR-002 runs it as IMP-06.)
  - Desktop packaging (`build:electron:mac`): the only build input changed is the server's test-error baseline, which only the server typecheck reads (IMP-05 proves it from a clean install); left to delivery's release checks.
  - Two-server E2E (AC-001 … AC-007, AC-010 over real HTTP), the tampering proxy (AC-003), a stopped peer (AC-006), app-level history delete (AC-007): API/E2E.
  - AGY/Grok/ACP tool-call limits (AC-009 for those runtimes): FU-001, needs signed-in runtimes.

## Frontend Rendered-Result Check (When Applicable)

`Not Applicable` — server-only change (the web part is a settings doc page, no rendered UI change).

## Downstream Coverage Hints / Suggested Scenarios

- Two servers, A → B `delegate_task(node, reference_files: [mp4, pdf, png])`: B's work packet lists three paths under B's agent folder `received_files/<A's run ID>/`; bytes and SHA-256 equal; files read-only; `files_sent: 3`.
- B's task agent replies with a file (`node` set, as its instruction says): A's message lists A-local paths; the sender's log keeps its own paths.
- Re-send the same file: only the status request, no pieces (RF-11). Same name, new content: replaced in place.
- A file outside the workspace, a symlink out, a folder, over the limit, two of one name: refused before anything is sent.
- Tampering proxy corrupting a piece: `REFERENCE_FILE_CHECK_FAILED` naming the file; nothing delivered.
- Stop B mid-upload: the call fails naming the file; B has only a `.partial`, swept after 24 h.
- Delete the receiving run's history: its folder goes; the store entry goes on the sweep once nothing links it (after 24 h untouched).
- RF-14: a message to a delegated run without `node` → `NODE_REQUIRED`; with the wrong node → `NODE_MISMATCH`.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- Existing two-server E2E bodies need `files` (the gateway now requires the field on `messages` / `run-messages`, empty when there are none), and the 492 flows that messaged a linked remote run without `node` now get `NODE_REQUIRED`: those assertions need `node`.
- AC-001 … AC-007 and AC-010 over real HTTP with real signing (the in-process tests replace HTTP and the gate's signature check).
- AC-009 on Codex and Claude with a slow transfer, if API/E2E judges it needed.
