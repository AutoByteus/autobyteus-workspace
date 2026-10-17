> **Beta.** Offered only to desktop installs with **Settings > Updates > Receive beta updates** turned on.

## What's New
- **One collaboration model.** Inside your run, agents talk with `send_message_to`. To involve an agent or team from outside the run, an agent first delegates with `delegate_task`, then talks with the new task agent by its run id. Messaging never starts a new agent.
- **Collaboration text written for each agent.** Standalone agents, team members, task agents and task agent teams each read instructions written for their role, in one vocabulary, with each rule stated once.
- **Split Task tools.** The single `create_or_update_task` tool is replaced by `create_task` (creates a Project Task) and `update_task` (updates any Task by its ID: description, status, context files, closing with DONE or CANCELLED, and reopening). Results and error codes are unchanged.
- **NFS Guide preview.** Settings > Nodes has a new NFS Guide tab that explains shared network workspaces. Its commands and downloads stay unavailable until a verified AutoByteus NFS release is published.

## Improvements
- An agent that tries to delegate to itself, a teammate or its own team is refused and told to message instead.
- Messaging an address that is not in the run returns "not found" with guidance to delegate. It no longer creates a collaborator or a helper copy.
- An agent is no longer told its own address, or a sender address that does not reach the sender. Replies go to the sender's run id, or to the sender address only where that address reaches it.
- An agent replies to a report only when the report asks for a reply. This stops report/acknowledgement loops between a delegator and its task agent.
- Tool descriptions, results and refusals for `send_message_to`, `delegate_task` and the Task tools use the same wording on every runtime, and every refusal is returned to the agent with guidance.
- No Task tool is added to agents automatically any more. The guidance for closing and reopening Tasks now lives in the `update_task` description, so only agents configured with that tool see it.

## Fixes
- File Explorer: finishing an earlier Save no longer discards what you typed after the Save started.
- The `@` mention note no longer suggests delegating to a teammate.
- Team prompts no longer describe nested teams.
- Agents that only delegate no longer receive a Task-closing instruction they have no reason to act on.

## Upgrade Notes
- **Stored collaborators become task agents.** At first start, runs that earlier releases recorded as collaborators are converted into ordinary delegated task agents. Conversations and memory are kept, and a second start changes nothing. Converted runs are not converted back if you return to an earlier version.
- **Talking with an outside agent:** delegate first, then talk by run id. An agent that messages a former collaborator by its address now gets "not found"; it reaches that task agent by run id.
- **Imported Memory Sync data:** collaborators in Team runs imported from another node are not listed in the imported Memory explorer until that node runs this release and syncs again. They then appear as delegated task agents. No file is lost.
- **Task tools:** `create_or_update_task` is removed, with no alias. An agent definition that still lists only that name launches, but without Task tools. Select `create_task` and/or `update_task` for every agent that needs them. The Project Task Manager in the AutoByteus agents repository is already updated.
- A third-party MCP tool named `create_task` or `update_task` is replaced by the built-in tool of that name, with a logged warning.
- **Codex:** the new collaboration wording was verified with Claude (Sonnet) and the AutoByteus runtime (DeepSeek). The Codex runtime has not yet been checked with it. A Codex check follows after October 22 and is a condition for the stable release.
- Messages and notes saved by earlier releases still display as before.
