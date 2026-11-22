# Docs Sync Report — cross-node-file-transfer-587 (autobyteus-587)

## Scope

- Ticket: `cross-node-file-transfer-587` (autobyteus-587), `task_size` `Large`, `architectural_risk` `High`, route `Reviewed` (architecture review ARCH-REV-001 … 002; source reviews CRR-001, 004, 006, 008 … 011; API/E2E API-REV-001 … 005; test-code reviews CRR-003, 005, 007, 012).
- Trigger: the code reviewer's CRR-012 Pass (test-code review of API/E2E round 5), which delivers the package after four delivery reroutes.
- Bootstrap base reference: `origin/personal` @ `fbe714f8bb`.
- Integrated base reference used for docs sync: `origin/personal` @ `50af37b59b` (autobyteus-28 arm64 AppImage, autobyteus-598 chrome-vnc pins; packaging only), merged into the ticket branch as `dc6e6e550b` with no conflicts, on top of the reviewed state `f1f0dd92f0` that already holds the merges of autobyteus-22 (`575c4ec9ed`) and autobyteus-591 (`bcd05494cb`). Delivery docs edits started only after this merge.
- Post-integration verification reference: the merged state `dc6e6e550b`; commands and results in `release-deployment-report.md` § Initial Delivery Integration Refresh and `evidence/DEL-post-integration/`.

## Why Docs Were Updated

- Summary: files attached to `delegate_task` or `send_message_to` for an agent on another node are now copied there (signed pieces, SHA-256, once per content, read-only hard link under the receiver's own folder, all or nothing, the tool call waits). A saved Task goes to another node as a new copy or to an existing one, with its own context files (DEC-009). Every message to an agent on another node names its node (RF-14, DEC-006), answered by one owner (`PeerRunNodes`). The node limit is a server setting (`AUTOBYTEUS_RECEIVED_FILE_MAX_MB`). Memory Sync skips received files.
- Why this should live in long-lived project docs: the collaboration model is the canonical contract (DESIGN.md: changes to messaging follow it or update it in the same change); the module docs are what the next change to messaging, the peer routes or Task delegation reads first.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `DESIGN.md` | Project design rules | No change | The ticket follows rule 9 (both nodes run one release, no version handling) and adds no rule. |
| `TESTING.md` | The ticket changes required inputs of owners tests construct; a build input (`typecheck-baseline.json`) | No change by delivery (already updated) | API/E2E added the row for "a required input of a server owner that tests construct directly" at my proposal (round 3): the whole unit suite and the whole `test:integration`, a search for constructions, and the reason (the typecheck baseline hides stale constructions). The fresh-start check it requires for a build input ran (API-12). |
| `RELEASE.md` | Finalization and release rules | No change | Followed as written; the base's own edits (the clean-image AppImage check, the iOS icon check) are not this ticket's. |
| `GLOSSARY.md` | Terms | No change by delivery (already updated) | The "Received Files" section (reference file, received file, the node's received files, transfer, received file limit) verified against the code and CM-14. |
| `docs/design-cases.md` | Design cases | No change | The ticket adds no case. |
| `autobyteus-server-ts/docs/design/collaboration_model.md` | The canonical contract | No change by delivery (already updated) | CM-10, CM-11 and CM-14 verified against `peer-run-nodes.ts`, `outgoing-files.ts`, `received-files.ts` and the E2E receipts (RC-56 … RC-61): every message to another node names its node (`NODE_REQUIRED`, `NODE_MISMATCH`, `NODE_NOT_PAIRED`); saved Tasks and their context files travel; the one workspace exception; the 24 h cleanup. |
| `autobyteus-server-ts/docs/modules/agent_communication.md` | The router's paths | No change by delivery (already updated) | The node path order peer → `PeerRunNodes` → upload → `admitPeerRun` → delivery, and the symbols it names, exist in the code. |
| `autobyteus-server-ts/docs/modules/agent_tools.md` | `delegate_task` and `send_message_to` | No change by delivery (already updated) | The three input modes, `node` required for a copy on another node and refused for a local one, `files_sent`, the Task's context files. |
| `autobyteus-server-ts/docs/modules/remote_collaboration.md` | The peer routes and the Task paragraphs | Updated | The implementation's "Reference files between nodes" section and the RF-14 paragraph verified. Two statements the saved-Task decision (DEC-009) made false are corrected: "Saved Task … is refused once" and "refuses a Task with files". The intro paragraph's older wording about authentication is FU-006 of autobyteus-492, not this ticket's. |
| `autobyteus-server-ts/docs/modules/projects.md` | Saved Tasks given to an existing copy and the work packet | Updated | "A run on a peer node takes no Task with files" is false since DEC-009; it now names `node` and the copied context files. "the files themselves are not copied" is now said for one node, with a pointer to CM-14 for another. |
| `autobyteus-server-ts/docs/features/memory_sync.md` | What the scanner exports | Updated | It skips every `received_files` folder (DEC-007). Corrected in the first delivery round; verified against `memory-sync-path-policy.ts`. |
| `autobyteus-server-ts/docs/modules/agent_artifacts.md` | `reference_files` | Updated | A pointer that either tool copies files to another node and the recipient reads its own paths. |
| `autobyteus-web/docs/settings.md` | Server settings | No change by delivery (already updated) | "Server Settings: Received File Size Limit": `AUTOBYTEUS_RECEIVED_FILE_MAX_MB`, default 2048, allowed 1–4096. Verified against `received-file-size-limit-setting.ts`. |
| `autobyteus-server-ts/docs/design/node_access_model.md` | Peer routes, body handling | No change | It covers `/rest/remote/*` as a prefix; the two new routes sit under it. The signed fields (`pathWithQuery`, body hash) are in `peer-request-signature.ts`, as the new section describes. |
| `autobyteus-server-ts/docs/modules/prompt_engineering.md`, `autobyteus-web/docs/chat.md` | Collaboration wording, composer | No change | They describe the wording authority and the `@` flow, not file transfer; the one catalogue text the ticket changed (M-26, the saved-Task input rule) is checked against the source by `result-catalogue.test.ts`, and no doc quotes it. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `collaboration_model.md`, `remote_collaboration.md`, `agent_communication.md`, `agent_tools.md`, `GLOSSARY.md`, web `settings.md` | Update (code commits) | CM-10, CM-11, CM-14, the engine table, the node path, the three tool modes, the Received Files terms, the limit setting | The ticket's behavior |
| `remote_collaboration.md` | Update (delivery) | "Saved Task" and "A follow-up Task" paragraphs | DEC-009 |
| `projects.md` | Update (delivery) | Two statements about Tasks with files on a peer | DEC-009 |
| `memory_sync.md`, `agent_artifacts.md` | Update (delivery, round 1) | `received_files` skipped by the scanner; the cross-node copy | DEC-007; reference files |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Reference files across nodes | Copy, never share; workspace-only (one exception: a saved Task's own context files); per-file limit at the receiver, 4 GiB per call; signed 8 MiB pieces, resume, dedup by SHA-256; hard link under the receiver's own folder; all or nothing | `reference-files-contract.md` (RFC-001), `requirements-doc.md` DEC-001 … DEC-010 | `collaboration_model.md` CM-14, `remote_collaboration.md` |
| Every cross-node send names its node | One owner (`PeerRunNodes`) answers `NODE_REQUIRED`, `NODE_MISMATCH`, `NODE_NOT_PAIRED`; the order on the node path | `design-spec.md` SR-010, SR-011 | `collaboration_model.md` CM-11, `agent_communication.md` |
| Lifecycle of received files | History delete removes the names; a sweep removes unlinked bytes untouched for 24 h and abandoned partials, at startup and after each delete; no periodic cleanup | RFC-001 RF-10 | `remote_collaboration.md` "Reference files between nodes", the Cleanup bullet |
| Accepted risks | DEC-008 (tool-call limits of AGY/Grok/ACP unmeasured) and DEC-010 (a Task's context files are a deliberate route around the workspace rule) | `requirements-doc.md` | The requirements doc and the terminal message; no long-lived doc states a risk |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| "A linked run's follow-ups never name the node" (CM-11) | Every cross-node message names the node (RF-14) | `collaboration_model.md` CM-11, `agent_tools.md` |
| `delegate_task` with `task_id` or `reference_files` and `node` refused | Allowed: files copied, saved Tasks delegated across nodes (DEC-009) | `agent_tools.md`, `remote_collaboration.md`, `projects.md` |
| `peerRunAdmission` / `closedPeerRunRefusal` | `PeerRunNodes.check` then `CrossRunMessageDelivery.admitPeerRun` | `agent_communication.md`, `remote_collaboration.md` |
| "Attachments … come in later slices" | Reference files cross nodes (CM-14) | `collaboration_model.md` § 4 and § 5 |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: verify from the evidence (done: `release-deployment-report.md` § Verification), commit, archive, finalize.
- Notes: one out-of-scope doc problem found: FU-010 (`remote_collaboration.md` still says remote messages stay out of every run view, true only for Team and Org views since autobyteus-565).
