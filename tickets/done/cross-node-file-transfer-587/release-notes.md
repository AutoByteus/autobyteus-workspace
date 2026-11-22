## What you need to do

- Update every node that is paired with another node to this release together. A node on this release refuses a message or delegation request from a paired node on an older release as malformed, so two paired nodes on different releases cannot exchange messages reliably until both are updated.

## Agents can send files to agents on other nodes

- `delegate_task` and `send_message_to` with `reference_files` now work between nodes. The files are copied to the receiving node, which keeps its own copy: the receiving agent reads them in its own folder, under `received_files/<the sender's run ID>/`, read-only, and the message or work packet lists those paths. Nothing is shared between the two computers.
- A saved Project Task can be given to another node, as a new agent or team there or to an existing copy, and its own context files go with it. A team receives them in its coordinator's folder.
- Only files inside the sending agent's workspace can be sent, with one exception: the context files of a saved Task you gave it. Any other file, a link that leads out of the workspace, or a folder is refused, and the agent is told which file and why.
- The tool call waits until the files arrived and the message or delegation was delivered, and its result says how many files were sent (`files_sent`). If any file cannot be sent, nothing is delivered. A transfer that breaks resumes from the part already received on the next try, and a file the receiving node already holds is not uploaded again.
- Files are checked (size and SHA-256) on arrival. A node accepts files up to a per-file limit, 2 GiB by default; change it in Settings with `AUTOBYTEUS_RECEIVED_FILE_MAX_MB` (1 to 4096 MiB). One call carries at most 4 GiB.
- Deleting a run's history in the app deletes its received files. The receiving node frees stored bytes that no run uses any more, and abandoned partial uploads, at a cleanup run at the next start or after a later delete, once they have been untouched for 24 hours; there is no periodic cleanup.
- Received files are not copied to your Memory hub.

### Good to know

- Every message to an agent on another node now names the node: `send_message_to` needs `node` together with the run ID, also for a run it delegated to. Without it, or with another node's name, the agent is told which node to pass. `delegate_task` to an existing copy on another node needs `node` too.
- On Codex and Claude, the Agent Tools server now allows each tool call an hour, so a long file transfer is not cut. Other runtimes (Antigravity, Grok and the ACP-based ones) keep their own default limit, which has not been measured: a transfer longer than it fails cleanly and can be retried or sent in smaller parts.
- A saved Task's context files can be any file an agent attached to the Task, so a file outside the workspace can reach another node that way. The delegation result and the receiving node's message name every file sent.
- Each node shows the paths of its own copies. The largest file tested was 20 MiB.
