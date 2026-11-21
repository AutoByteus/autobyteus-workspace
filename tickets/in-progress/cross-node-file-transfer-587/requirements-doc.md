# Requirements Document — cross-node-file-transfer-587 (autobyteus-587)

## Document Status

- Status: `Ready for Approval` (DEC-001 … DEC-003 need the founder)
- Current solution revision ID: `SR-001`
- Request: Project Task `autobyteus-587`; requested by `/project_task_manager` for the founder
- Owner: Solution Designer; date 2026-11-21
- Approved by and reference: pending

## Problem And Desired Outcome

- Problem: agents on two paired nodes cannot hand each other files: cross-node `delegate_task` and `send_message_to` refuse `reference_files`.
- Desired outcome: an agent attaches local files (`reference_files`) when it delegates to, or messages, an agent on another node; the files are sent over the authenticated peer connection; the recipient gets its own local copies and their paths on its node, in both directions (task inputs and returned deliverables). Nothing is shared implicitly: shared storage (NFS + skill) stays a separate, explicit route.
- Success: an agent on node A delegates a task with a 300 MB `.mp4` and a PDF to node B; B's task agent reads both from local paths and sends a rendered video back to A with `send_message_to`; A's agent opens it locally; each file's SHA-256 matches on both sides.

## Behavior

| ID | Current | Desired | Preserved |
| --- | --- | --- | --- |
| BEH-001 | Cross-node delegation refuses files | Files sent with the delegation; the work packet lists the received paths on B | Local delegation; cross-node refusals of `task_id` |
| BEH-002 | Cross-node messages refuse files | Files sent with the message; B's message lists the received paths | Local messages; message rules (autobyteus-492) |
| BEH-003 | — | Each node keeps its own copy and its own paths; each side's message log names its own paths | CM-9 (each node writes its own line) |

## Scope Guardrail

### In-Scope Use Cases

| ID | Use Case |
| --- | --- |
| UC-001 | Delegate to another node with files |
| UC-002 | Message an agent on another node (linked or with `node`) with files |
| UC-003 | Return deliverables to the delegator on another node with files |
| UC-004 | Repeated transfers of the same file do not multiply disk use; received files are cleaned up with their runs |

### Out Of Scope

- Shared storage (AutoByteus NFS + skill, autobyteus-270): separate. Folders (directories) as attachments. Transfers without a message or delegation. Progress display in the app. Files on nodes that are not paired. A release.

### Non-Goals

- Resuming a transfer after the sending agent's call ended (a failed call is retried by the agent).

### Preserved Behavior Boundary

All local `reference_files` behavior; peer authentication (NA-2, NA-7, NA-9); autobyteus-492/565 message rules and views.

### Prerequisites

None.

## Requirements

| ID | Requirement | Priority | Source |
| --- | --- | --- | --- |
| REQ-001 | `delegate_task` with `node` and `send_message_to` to an agent on another node (by `node`, or a linked run) accept `reference_files`. | Must | Task |
| REQ-002 | Each file is sent over the authenticated peer connection in raw bytes (no base64 in JSON), in bounded signed pieces, and its size and SHA-256 are verified on arrival; a file that fails verification is not delivered. | Must | Task; peer gate (investigation) |
| REQ-003 | The receiving node stores the files in the receiving run's own folder and gives the recipient their local paths in its message or work packet; the sender's records keep the sender's paths. | Must | Task |
| REQ-004 | Only files allowed by DEC-001 can be sent; symlinks are resolved and must stay inside the allowed places; directories are refused. | Must | Task (security); DEC-001 |
| REQ-005 | Size limits per DEC-002, checked by the sender before sending and enforced by the receiver. | Must | DEC-002 |
| REQ-006 | The tool call behaves per DEC-003; on any failure the agent gets a clear reason (which file, why), and nothing is delivered to the recipient (the message or delegation is all or nothing). | Must | Task; DEC-003 |
| REQ-007 | The receiving node keeps one stored copy per content (SHA-256) and links it into each run that received it; a re-sent file is not uploaded again; stored copies no run uses any more, and abandoned partial uploads, are removed (DEC-004). | Must | Task |
| REQ-008 | Both nodes need this release; an older peer's refusal is reported as today (DESIGN.md rule 9). | Must | DESIGN.md |

## Acceptance Criteria

| ID | REQ | Trigger | Expected | Verification |
| --- | --- | --- | --- | --- |
| AC-001 | 001, 003 | A delegates to B with an `.mp4`, a PDF and a PNG | B's work packet lists three local paths in B's run folder; bytes and SHA-256 equal A's | Two-server E2E with binary files |
| AC-002 | 001, 003 | B's task agent messages A (linked, no `node`) with a file; and a PM messages another node's PM with `node` and a file | A's message lists A-local paths; contents equal | Two-server E2E |
| AC-003 | 002 | A piece is corrupted or truncated in transit | Verification fails; nothing delivered; the agent is told which file failed | Server test with a tampering proxy |
| AC-004 | 004 | A file outside the allowed places, a symlink pointing outside, a directory, `..` paths | Refused before anything is sent, naming the file | Server unit tests |
| AC-005 | 005 | A file over the limit | Refused by the sender before upload; a forged oversize upload refused by the receiver | Server tests |
| AC-006 | 006 | The peer stops mid-transfer | The call fails with the file and reason; the recipient gets nothing | E2E with a stopped peer |
| AC-007 | 007 | The same file sent twice to two runs | Uploaded once (second call skips); both runs have it; deleting one run keeps the other's file; deleting both reclaims the space; partial uploads older than the window are removed | Server tests |
| AC-008 | — | Local `reference_files` | Unchanged | Existing suites |

## Decisions

| ID | Question | Options / Evidence | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-001 | Which local files may an agent send to another node? | Locally any absolute file of the node is accepted (BEH-003). Sending moves data off the machine | (a) only files inside the sending run's workspace folder, or files it received itself (its run's received files); (b) any file the agent can reference locally. (a) stops a misled agent from sending `~/.ssh` or another project's data to another machine; a file elsewhere is copied into the workspace first, a visible step. **Recommend (a).** | Founder | Needs user |
| DEC-002 | How large may files be? | Context-file limits: 2 GiB audio/video, 25 MiB others; Memory Sync stages multi-GiB files in 8 MiB pieces | One limit per file, set on each node for what it accepts (new setting, default 2 GiB), and a total per message or delegation of 4 GiB; any file type. **Recommend this.** | Founder | Needs user |
| DEC-003 | Does the tool call wait for the transfer? | A 300 MB file over a 20 Mbit/s upload takes ~2 min; runtime tool timeouts are unknown (UNK-001) | (a) wait: the call returns when every file arrived and the message or delegation is delivered ("delivered, 2 files"); timeouts of our tools raised where we configure them; (b) return at once and deliver in the background, with a later notice. (a) has no hidden state: "sent" means delivered, as between colleagues. **Recommend (a)**, with the timeout measured and set in design. | Founder | Needs user |
| DEC-004 | Deduplication and retention | Task asks to consider SHA-256 dedup and retention | A content-addressed store per receiving node; each run gets a link (same file, no extra space) under `received_files/`; a stored copy no run links any more is removed by a sweep; partial uploads are removed after 24 h. No time-based expiry of delivered files: they live as long as their run. | Solution Designer | Decided |
| DEC-005 | Where files land and how they are named | — | `<receiving run folder>/received_files/<first 12 hex of SHA-256>/<original file name>` (name sanitized): readable names, no collisions; the recipient's message lists these paths under "Reference files", as local messages do. | Solution Designer | Decided |

## Data Continuity

- New stored data: received files (per run) and the node's store; no existing data changes.

## Readiness

- Content ready: `Yes`; open: DEC-001, DEC-002, DEC-003.
