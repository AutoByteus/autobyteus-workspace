# Requirements Document — cross-node-file-transfer-587 (autobyteus-587)

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-010`
- Request: Project Task `autobyteus-587`; requested by `/project_task_manager` for the founder
- Owner: Solution Designer; date 2026-11-21
- Approved by and reference: `User` (the founder), 2026-11-21, in the Solution Designer's conversation: "Yes I strongly agree the agent can only send files in its own workspace; size limits I agree with you; I guess the tool call will need to wait" (DEC-001 as he worded it, DEC-002, DEC-003 (a)); DEC-004 and DEC-005 by the Solution Designer within the direction, explained to him the same day. Baseline SR-002.

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
| REQ-004 | Only files inside the sending run's workspace folder can be sent (DEC-001); symlinks are resolved and must stay inside the allowed places; directories are refused. | Must | Task (security); DEC-001 |
| REQ-005 | Size limits per DEC-002, checked by the sender before sending and enforced by the receiver. | Must | DEC-002 |
| REQ-006 | The tool call behaves per DEC-003; on any failure the agent gets a clear reason (which file, why), and nothing is delivered to the recipient (the message or delegation is all or nothing). | Must | Task; DEC-003 |
| REQ-007 | The receiving node keeps one stored copy per content (SHA-256) and links it into each run that received it; a re-sent file is not uploaded again; stored copies no run uses any more, and abandoned partial uploads, are removed (DEC-004). | Must | Task |
| REQ-009 | Every `send_message_to` to an agent on another node names the node (`node`), as `delegate_task` does, linked or not; without it, or with the wrong node, the call is refused with the node to pass (RFC-001 RF-14). | Must | Founder, 2026-11-21 (DEC-006) |
| REQ-008 | Both nodes need this release; an older peer's refusal is reported as today (DESIGN.md rule 9). | Must | DESIGN.md |

## Acceptance Criteria

| ID | REQ | Trigger | Expected | Verification |
| --- | --- | --- | --- | --- |
| AC-001 | 001, 003 | A delegates to B with an `.mp4`, a PDF and a PNG | B's work packet lists three local paths in B's run folder; bytes and SHA-256 equal A's | Two-server E2E with binary files |
| AC-002 | 001, 003, 009 | B's task agent messages its delegator on A with `node` and a file; and a PM messages another node's PM with `node` and a file | A's message lists A-local paths; contents equal | Two-server E2E |
| AC-003 | 002 | A piece is corrupted or truncated in transit | Verification fails; nothing delivered; the agent is told which file failed | Server test with a tampering proxy |
| AC-004 | 004 | A file outside the allowed places, a symlink pointing outside, a directory, `..` paths | Refused before anything is sent, naming the file | Server unit tests |
| AC-005 | 005 | A file over the limit | Refused by the sender before upload; a forged oversize upload refused by the receiver | Server tests |
| AC-006 | 006 | The peer stops mid-transfer | The call fails with the file and reason; the recipient gets nothing | E2E with a stopped peer |
| AC-007 | 007 | The same file sent to two runs; then each run's history deleted in the app | Uploaded once (the second send skips it); both runs show it; deleting the first run's history removes it from that run only; deleting the second leaves the stored copy unused, and the next cleanup removes it once it has been untouched for 24 h (RF-10); partial uploads older than 24 h are removed | Server tests; E2E (history delete) |
| AC-008 | — | Local `reference_files` | Unchanged | Existing suites |
| AC-011 | 007 | Memory Sync runs on a node whose agents received files | No file under any `received_files/` is exported to the hub; the message lines that name them are | Unit test on the path policy; Memory Sync export test |
| AC-012 | 001, 003 | A PM delegates a saved Project Task with two context files to an Agent and to a Team on another node (`task_id` + `node`), then gives another saved Task with a file to the existing remote copy | Each work packet lists received paths in the entry agent's folder (a Team: the coordinator); bytes equal; a context file outside the workspace is accepted, any other file outside it refused | Two-server E2E |
| AC-010 | 009 | A delegator messages its remote copy, and the copy replies, without `node`; then with the wrong node; then with the right one | First two refused with the node to pass; the third delivered | Server tests; two-server E2E |
| AC-009 | 006 | A transfer that takes longer than a runtime's default tool-call limit (DEC-003 (a)) | The call still completes on each runtime we configure (Codex, Claude, AutoByteus); the limit we set is stated | Feasibility of the proof (updated requirements standard): needs signed-in Codex and Claude runtimes; the founder's machine has them, but tests may not use his accounts (TESTING.md). Measure each runtime's limit in design with a slow stub tool; if a signed-in run is not safely available, decide the evidence before approval as an evidence decision |

## Decisions

| ID | Question | Options / Evidence | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-001 | Which local files may an agent send to another node? | Locally any absolute file of the node is accepted (BEH-003). Sending moves data off the machine | (a) only files inside the sending run's workspace folder, or files it received itself (its run's received files); (b) any file the agent can reference locally. (a) stops a misled agent from sending `~/.ssh` or another project's data to another machine; a file elsewhere is copied into the workspace first, a visible step. **Recommend (a).** Founder, 2026-11-21: "the agent can only send files in its own workspace" → **Decided: only files inside the sending run's workspace folder** (symlinks resolved, must stay inside). A file it received (in its run folder) is forwarded by copying it into its workspace first, a visible step. | Founder | Decided (User) |
| DEC-002 | How large may files be? | Context-file limits: 2 GiB audio/video, 25 MiB others; Memory Sync stages multi-GiB files in 8 MiB pieces | One limit per file, set on each node for what it accepts (new setting, default 2 GiB), and a total per message or delegation of 4 GiB; any file type. **Recommend this.** Founder, 2026-11-21: "size limits I agree with you" → **Decided.** | Founder | Decided (User) |
| DEC-003 | Does the tool call wait for the transfer? | A 300 MB file over a 20 Mbit/s upload takes ~2 min; runtime tool timeouts are unknown (UNK-001) | (a) wait: the call returns when every file arrived and the message or delegation is delivered ("delivered, 2 files"); timeouts of our tools raised where we configure them; (b) return at once and deliver in the background, with a later notice. (a) has no hidden state: "sent" means delivered, as between colleagues. **Recommend (a)**, with the timeout measured and set in design. Founder, 2026-11-21: "the tool call will need to wait" → **Decided (a).** | Founder | Decided (User) |
| DEC-004 | Deduplication and retention | Task asks to consider SHA-256 dedup and retention | A content-addressed store per receiving node; each run gets a link (same file, no extra space) under `received_files/`; a stored copy no run links any more is removed by a sweep; partial uploads are removed after 24 h. No time-based expiry of delivered files: they live as long as their run. Founder, 2026-11-21, confirming: a received file belongs to the receiving run and is stored with it; deleting that run's history completely (as in the app) removes its received files too. Another run that received the same file keeps its own. | Solution Designer; confirmed by the founder | Decided |
| DEC-006 | Must `send_message_to` name the node for every cross-node message? | Today a linked run's ID routes without `node` (autobyteus-191); an unlinked one needs it (492) | Symmetric with `delegate_task`: no hidden cross-machine route, one rule; the node is always at hand (delegation result, header, list). Founder, 2026-11-21: "always if you're sending into another node then you add the node parameter … similar to delegate task"; "Yes include in this ticket". **Decided: required, in this ticket.** | Founder | Decided (User) |
| DEC-007 | Does Memory Sync copy received files to the memory hub? | ARCH-REV-001 AR-001: Memory Sync exports every regular file under `memory/agents` and `memory/agent_teams` except temporary/lock files (`local-memory-export-scanner.ts:25-79`, `memory-sync-path-policy.ts:3-7`); received files live there, so up to 2 GiB per file would be uploaded to the hub: a second flow of data off the node | (a) skip `received_files/` in Memory Sync's path policy; (b) sync them to the hub too, with the cost (every received file uploaded again, hub disk) | Received files are copies of another node's files, not this run's memory; the hub keeps memory (journals, traces, messages), and the message lines that name the files still sync. (a) keeps one deliberate data flow per file (RF-2). **Recommend (a).** Founder, 2026-11-21: "Memory sync of course do not copy the files … memory sync should not copy files … we cut a tons of duplicated files" → **Decided (a).** | Founder | Decided (User) |
| DEC-008 | Evidence decision for AC-009 (tool-call limits) | Codex and Claude: limits set in our MCP config (`tool_timeout_sec`, `timeout`); AutoByteus: no limit. Antigravity, Grok and ACP-based runtimes offer no per-server setting in our config; their defaults are unknown, and measuring them needs signed-in CLI runtimes that tests may not use (TESTING.md) | (a) arrange signed-in runtimes; (b) other evidence: the materialized Codex/Claude configs (unit tests) and a slow stub tool on the scripted AGY fixture runtime; (c) accept the unverified risk for AGY/Grok/ACP | The risk is low and bounded: a transfer longer than such a runtime's default fails cleanly (all or nothing, RF-5), the agent is told, and it can retry or send smaller files; nothing is lost or half-delivered. **Decided: (b) for Codex/Claude, (c) for AGY/Grok/ACP**, with follow-up FU-001 to measure them when a signed-in environment is available. Option (a) not taken: it would use the founder's accounts. | Solution Designer (evidence decision; founder informed) | Decided |
| DEC-009 | Do a saved Task's files travel when the Task goes to another node? (CRR-008 FU-007) | Since autobyteus-591 a saved Task can be given to an existing copy on another node, refused when it has files (`task-delegation.ts:401`); `delegate_task` with `task_id` and `node` (a new copy from a saved Task) is refused entirely (`remote-delegation.ts:43`, "yet"). A Task's context files live in its Project folder, outside any workspace (RF-3) | Founder, 2026-11-21: "if the Project Task Manager delegates a task to a few remote teams or agents and that task has a file, of course we need to send the file … for a team you send it to the coordinator … we need to do it, even the follow-up". **Decided:** both forms are allowed across nodes: a new remote copy from a saved Task (`delegate_task` with `task_id` and `node`) and a saved Task given to an existing remote copy; the Task's context files are sent with it (to the Agent, or a Team's coordinator). RF-3 gains one exception: a saved Task's own context files may be sent (attaching them to the Task was the deliberate step); every other rule applies (limits, checksums, all or nothing). | Founder | Decided (User) |
| DEC-005 | Where files land and how they are named | — | Superseded by the founder's RFC-001 RF-7 and § 3 (2026-11-21): `<receiving agent's own folder>/received_files/<sender's run ID>/<file name>`, the same sender's same-named file replaces the earlier one; the bytes once per content in `<data>/received_files/<sha256>`. (Corrected at SR-008, ARCH-REV-001 AR-006.) | Founder | Decided (User) |

## Data Continuity

- New stored data: received files (per run) and the node's store; no existing data changes.

## Readiness

- Content ready: `Yes`. Approval recorded: `Yes` (SR-002). Ready for design: `Yes`.

## Supplemental Artifacts

| Artifact Path | Purpose | Related IDs | Status | Approval |
| --- | --- | --- | --- | --- |
| `tickets/in-progress/cross-node-file-transfer-587/reference-files-contract.md` (RFC-001) | The complete contract of reference files on `send_message_to` and `delegate_task`, on one node and across nodes: rules RF-1 … RF-13, route table, refusals, wire, storage, examples | REQ-001 … REQ-008, AC-001 … AC-009, DEC-001 … DEC-005 | Approved (SR-005) | Approved by the founder, 2026-11-21: "Great I think it's clear now you can work now", with the node-level `received_files` at the server data root |
