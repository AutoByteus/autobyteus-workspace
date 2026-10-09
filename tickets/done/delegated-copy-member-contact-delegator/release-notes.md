# Release Notes — Delegated Agents Can Reach the Agent That Delegated Them

Status: prepared before user verification. Whether this ships in a release, and with which version, is decided at finalization.

## Fixed
- In an agent's own run, the agents it delegates work to (members of a delegated team, or a delegated agent) can now reach that agent. Before, they could not. Example: a Project Task Manager agent delegates to a software engineering team. The team's code reviewer can now type `@Project Task Manager` and send the message, and it arrives in the Project Task Manager's existing conversation. It also shows in the Team tab.
- Agents that have the `list_available_agents` tool now see the delegating agent in that list, with an address they can message.

## Changed
- When a delegated agent is told about the delegating agent, the note marks it "the run's own agent". It tells the delegated agent to message it with `send_message_to`. It does not offer to delegate work back to it; that is still refused.

## Unchanged
- An agent's own `@` menu still never offers itself.
- `@` menus and agent lists in Team and Org runs are unchanged.
- Agent instructions and delegated work packets are unchanged.
- A message to the delegating agent never starts a second copy of it.

## Notes
- No reset or data migration is needed. Saved conversations show their `@` notes as before.
