## What you need to do
- Nothing to do before upgrading. On the first start, your saved organization runs are converted to the new shape (their conversations, messages, memory, Tasks and history are kept; files an organization's agent received from another node, or attached to messages and Tasks, still open from where they now are). This conversion cannot be undone: after upgrading, do not install an older version. If you need to go back, contact support instead.
- If you work with a paired node, upgrade both nodes. A node on an older version refuses the new team-membership update between nodes; the other node then catches up the next time it reads that team's status.

## What's New
- Teams inside an organization now follow their team definition, like any team run: adding or removing a member in the team definition updates the running organization's team (a busy member finishes its turn first), and the other members are told.
- Organizations follow their organization definition: mounting a new team or adding an agent adds it to the running organization (offline until first used); unmounting a team or removing an agent lets it finish its work, then removes it, keeping its history.
- Organization handoff rules follow the members: a rule to a member that left is left out until the member comes back, and the agent whose rules changed is told.
- On a paired node, the node that delegated work to a team on another node now sees the team's current members after the team changes.

## Improvements
- Each team and agent of an organization now keeps its own run, memory and messages, so team features work the same inside and outside organizations; the organization still looks and works as one in the app (one launch page, one view, one Stop and reopen).
