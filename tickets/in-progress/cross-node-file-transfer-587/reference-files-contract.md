# Reference Files Contract — `send_message_to` and `delegate_task`, on one node and across nodes

## Contract Status

- Contract ID: `RFC-001`
- Status: `Ready for Approval` (behavior-defining supplement of `requirements-doc.md` SR-002; part of its approval basis once approved)
- Owner: Solution Designer (autobyteus-587)
- Where it lives after delivery: its rules become rule CM-14 of `autobyteus-server-ts/docs/design/collaboration_model.md` (the canonical collaboration contract, which today says only "Later steps add attachment transfer"); the wire and storage mechanics go to `docs/modules/remote_collaboration.md` and `docs/modules/agent_communication.md`. This file is the approved source for that docs change.
- Related contracts: collaboration model CM-5 … CM-13; Node Access Model NA-9 (signed peer requests); ATC-001 (`tickets/done/send-message-delegate-task-semantics/agent-team-collaboration-contract.md`, the historical tool semantics; unchanged).

## Purpose

Two agents on two nodes work like two colleagues on two machines (the founder, 2026-11-21): "I have a file to send you." There is no hidden sharing. A file attached to a message or a delegation that crosses nodes is **copied** to the receiving node, which owns its copy; the recipient works on a path on its own node. Shared storage (AutoByteus NFS and its skill) is a separate, explicit route: an agent that uses it names the shared path in its message text and attaches nothing.

## 1. Vocabulary

| Word | Meaning |
| --- | --- |
| Reference file | A file an agent attaches to `send_message_to` or `delegate_task` in `reference_files` (an absolute path on the sender's node). |
| Sending agent / receiving agent | The agent that calls the tool / the agent the message or work packet goes to (for a Team: its coordinator). |
| Workspace (of an agent) | The folder the agent runs in on its node: a standalone run's `workspaceRootPath`; a Team or Org member's launch `workspaceRootPath`; for a run a peer started, that node's temp workspace. |
| Agent's own folder | Where the node keeps the agent's memory: `memory/agents/<runId>/` (standalone), `memory/agent_teams/<teamRunId>/<agentRunId>/` (Team member), `memory/agent_orgs/<orgRunId>/…/<agentRunId>/` (Org agent). Deleting the run's history deletes it. |
| Received file | A file another node sent to an agent: it lives in that agent's own folder under `received_files/`. |
| Node file store | `memory/received-file-store/` on the receiving node: one stored copy per file content (named by its SHA-256), linked into every agent folder that received it. Never walked as runs. |
| Transfer | Moving one file from the sending node to the receiving node's store, in signed pieces, before the message or work packet is delivered. |

## 2. Rules

| Rule | Statement |
| --- | --- |
| RF-1 Same node: unchanged | On one node, `reference_files` keep today's behavior: absolute normalized paths of existing files (no folders, URLs, `..`); nothing is copied; the recipient reads the original path. |
| RF-2 Another node: a copy | When the recipient is on another node (`delegate_task` or `send_message_to` with `node`, or a run linked to another node), every reference file is copied to the receiving node. Each node owns its copy and its own paths. Nothing on one node ever points at a file on another. |
| RF-3 What may be sent | Only files inside the sending agent's workspace. The path is resolved (symlinks followed) and must stay inside the workspace's resolved folder; a folder, a missing file, a socket or device, or a path that leaves the workspace is refused before anything is sent. A file the agent received is forwarded by copying it into its workspace first. (Founder, DEC-001.) |
| RF-4 Limits | Each node sets the largest file it accepts (setting `AUTOBYTEUS_RECEIVED_FILE_MAX_MB`, default 2048 MiB); one message or delegation carries at most 4 GiB of files in total. Any file type. The sender asks the receiving node for its limit and checks every file before uploading any; the receiving node enforces its limit again on every piece. (Founder, DEC-002.) |
| RF-5 All or nothing | The message or work packet is delivered only after every file has arrived and its size and SHA-256 matched. If any file fails, nothing is delivered (a delegated run that was being started is discarded), and the tool result names the file and the reason. |
| RF-6 The call waits | The tool call returns after delivery, as any message: its result says how many files were sent. AutoByteus sets the tool-call time limit of the runtimes it configures so a transfer within RF-4 can finish (measured in design). (Founder, DEC-003.) |
| RF-7 Where files land | The receiving node places each file at `<receiving agent's own folder>/received_files/<first 12 hex of SHA-256>/<file name>`: the original file name, made safe (path separators and control characters removed; never `.` or `..`). The same content arriving twice for one agent is one file. |
| RF-8 What the recipient sees | The recipient's message (or work packet) lists the files on its own node, as local reference files are listed today, under the usual "Reference files:" block, and its header names the sender's node. The sender's own records keep the sender's paths. |
| RF-9 What each node records | Each node writes its own message-log line (CM-9) with the same message ID: the sender's line lists the sender's original paths; the receiver's line lists the received paths. The Messages view on each node opens the file at its own path. |
| RF-10 Ownership and deletion | A received file belongs to the agent that received it. Deleting that run's history (as in the app) deletes its received files. The node file store keeps one copy per content: it is removed when no agent folder links to it any more; another agent that received the same file keeps it. A transfer that broke off leaves pieces that are removed after 24 hours. Nothing else expires. (DEC-004, confirmed by the founder.) |
| RF-11 One upload per content | Before sending a file, the sender asks whether the receiving node already holds it (by SHA-256); a stored or fully received file is not uploaded again; a partly received one resumes from where it stopped. |
| RF-12 Security | Every transfer request is a signed peer request (NA-9) from a paired peer; a node accepts pieces only into its own store and places files only into the agent folder of the run the delivered message or work packet targets; no route lets a peer read or list another node's files. Size and SHA-256 are checked before a file is placed. |
| RF-14 Another node is always named | Every call whose recipient is on another node names it with `node`, for both tools, linked or not (founder, 2026-11-21: "always if you're sending into another node then you add the node parameter … similar to delegate task"). A message to a run on another node without `node` is refused with the node to pass; a `node` that is not where the run is gets refused with the right node. The node comes from the delegation result (`node`), the received message's header, or `list_running_agents`. This replaces autobyteus-191's "follow-ups never name the node" (CM-11 is updated with it). |
| RF-13 Shared storage is separate | `reference_files` across nodes always copy (RF-2). An agent that has a shared folder (NFS and its skill) and wants to use it writes the shared path in its message text and attaches nothing. |

## 3. Route Table

| # | Tool and target | Files go | Recipient sees | Sender's record |
| --- | --- | --- | --- | --- |
| 1 | `send_message_to` to an agent of its own run | nowhere (RF-1) | original paths | original paths |
| 2 | `send_message_to` to an agent of another run on this node | nowhere (RF-1) | original paths | original paths |
| 3 | `delegate_task` without `node` | nowhere (RF-1) | original paths in the work packet | — |
| 4 | `delegate_task` with `node` | copied to that node, into the new run's entry agent's folder (a Team: its coordinator) | received paths in the work packet | — (the delegation result says "N files sent") |
| 5 | `send_message_to` with `node` | copied to that node, into the receiving agent's folder | received paths | original paths |
| 6 | `send_message_to` to a run linked to another node (a remote task agent, or the delegator on the other node) | with `node` (RF-14): copied as in 5; without `node`: refused, naming the node to pass | received paths | original paths |

Rows 4–6 follow RF-2 … RF-12. Rows 1–3 are today's behavior.

## 4. Refusals

Every refusal comes before anything is delivered; texts are the agent-facing wording (final words in the wording authority).

| Code | When | Text (example) |
| --- | --- | --- |
| `REFERENCE_FILE_OUTSIDE_WORKSPACE` | A file is not inside the sending agent's workspace (after resolving links) | "`/Users/me/.ssh/id_ed25519` is outside your workspace, so nothing was sent. Only files in your workspace (`/work/project`) can go to another node; copy the file there first." |
| `REFERENCE_FILE_NOT_A_FILE` | A folder, missing file, socket or device | "`/work/project/out` is a folder, so nothing was sent. Send files, not folders (zip it first)." |
| `REFERENCE_FILE_TOO_LARGE` | Over the receiving node's limit, or over 4 GiB in total | "`render.mp4` is 3.1 GiB; node \"studio\" accepts files up to 2 GiB, so nothing was sent." |
| `NO_WORKSPACE` | The sending agent has no workspace folder | "You have no workspace folder, so no file can go to another node." |
| `REFERENCE_FILE_TRANSFER_FAILED` | A piece or the whole file failed (peer unreachable, timeout, refused) | "`report.pdf` could not be sent to node \"studio\" (it did not answer in time), so nothing was delivered. Try again." |
| `REFERENCE_FILE_CHECK_FAILED` | Size or SHA-256 did not match on arrival | "`render.mp4` arrived damaged on node \"studio\", so nothing was delivered. Try again." |
| `NODE_REQUIRED` | A message to a run on another node without `node` | "This agent runs on node \"mac-studio\"; pass node: \"mac-studio\" with its run id." |
| `NODE_MISMATCH` | `node` names a node the run is not on | "This agent runs on node \"studio\", not \"mac-studio\"; pass node: \"studio\"." |
| existing peer refusals | Switch off, unknown peer, unreachable, older peer (404) | as today |

## 5. Between Nodes (wire)

All requests are signed peer requests (route class `REMOTE_PEER`, NA-7, NA-9) and pass `PeerGateway` admission.

| Request | Body | Answer |
| --- | --- | --- |
| `POST /rest/remote/received-files/status` | `{files: [{sha256, size}]}` | `{maxFileBytes, files: [{sha256, receivedBytes, complete}]}` |
| `PUT /rest/remote/received-files/:sha256?offset=<n>&size=<total>` | raw bytes (`application/octet-stream`), at most 8 MiB per piece | `{receivedBytes, complete}`; on the last piece the node checks size and SHA-256 and moves the file into its store |
| delegated-run start, work packet, `messages`, `run-messages` (existing) | + `files: [{sha256, size, name}]` | as today; refused with `REFERENCE_FILE_CHECK_FAILED` when a named file is not complete in the store |

The sending node uploads every file first, then sends the message or work packet naming them; the receiving node places them (RF-7) when it accepts it, in the same step that writes its log line.

## 6. Examples

Node A (`mac-studio`) delegates to node B (`studio`):

```text
A's agent:  delegate_task({ node: "studio", recipient_address: "/video_editor",
              description: "Cut a 30 s teaser from the demo.",
              reference_files: ["/work/launch/demo.mp4", "/work/launch/brief.pdf"] })
A's result: { delegated: true, target_agent_run_id: "video_editor_…", node: "studio", files_sent: 2 }

B's work packet (what the task agent reads):
  … Cut a 30 s teaser from the demo.
  Reference files:
  - /data/memory/agents/video_editor_…/received_files/3f2a9c1e0b7d/demo.mp4
  - /data/memory/agents/video_editor_…/received_files/a81c44d29e05/brief.pdf
```

B's agent returns the result (row 6; `node` names A, as the work packet's header did, RF-14):

```text
B's agent:  send_message_to({ node: "mac-studio", target_agent_run_id: "<A's delegator run id>", content: "Teaser attached.",
              reference_files: ["/tmp/autobyteus/temp_workspace/teaser.mp4"] })
A's agent receives: "You received a message from … on node \"studio\". Teaser attached.
  Reference files:
  - /Users/me/.autobyteus/server-data/memory/agents/project_task_manager_…/received_files/9e1d0c7a33b2/teaser.mp4"
```

## 7. What This Contract Does Not Change

Same-node `reference_files` (RF-1); who may message or delegate to whom (CM-1 … CM-13; only CM-11's "follow-ups never name the node" changes, RF-14); the Messages views (autobyteus-565), except that a received file opens at its received path; NFS and its skill.
