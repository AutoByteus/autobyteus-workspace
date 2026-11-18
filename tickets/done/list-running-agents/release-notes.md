## Agents can find and message any running agent

- A new tool, `list_running_agents`, lists the agents and agent teams that a person started and that are running now, on this node or on a paired node. Each entry gives the run ID to message it with, its state (running or idle) and its workspace folder. Select the tool in an agent's tool list to give it to that agent; no agent has it until you do.
- `send_message_to` now reaches any running agent by its run ID: on this node by the run ID alone, and on a paired node by the run ID with the node's name. This works for every agent, including task agents and members of a Team or an Org. A message to an agent that works on a different Task is delivered instead of refused.
- A message never wakes or restarts anything. If the agent is not running, the sender is told that no running agent has that run ID and that a stopped agent is not woken. A stopped agent that a Task relates to the sender is still woken by its own Task's messages, as before.
- A message between agents that no Task relates shows in both agents' own conversations and is stored in both runs' message logs. It does not appear in the run views (such as a Team's Team tab).
- A Task that is closed stays closed: its task agent still refuses messages, whoever sends them, until the agent that assigned the Task reopens it.

### Good to know

- Both nodes need this release. A paired node on an older release does not know the new requests, so its agents cannot be listed or messaged by run ID and it shows as unreachable for them.
- The list shows each agent's workspace as the folder path on the node where it runs, so a paired node's agents show their paths to the node that asks.
