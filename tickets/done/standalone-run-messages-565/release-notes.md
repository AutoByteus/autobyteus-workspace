## Every agent run has a Messages list

- Every agent run you start now has Messages: a **Messages** tab in the right panel on the desktop, and **Messages** in the run's ⋮ menu on the phone. It lists every message that run's agent sent or received: from its task agents and teams, from other runs on the same node, and from runs on other nodes. Live messages appear without a reload.
- An agent on another node is named with a chip showing that node's name, so you can tell it from an agent on this node.
- The list shows the newest 50 messages first. A **Load more** button at the end brings the next 50, so a run with thousands of messages opens quickly. Reloading a run's view brings the list back to its newest page.
- A run that is a task agent of another run shows its own Messages the same way.
- Team and Org runs keep their Team and Org tabs, which show the messages between their own members as before.

### Good to know

- A run that has delegated work used to open on its **Team** tab. It now opens on **Activity**, like every other agent run. Messages is one click away on the right panel.
- Update both nodes together. A message between a node on this release and a paired node on an older release is refused, or the sending agent is told it failed, because the two releases no longer describe the sending and receiving agent the same way. Messages within one node, and between two nodes on this release, are not affected.
- Messages stored before this update stay as they are. An older message with another run or node shows the other agent's name when this node knows it from the run's Task, and otherwise its run ID.
