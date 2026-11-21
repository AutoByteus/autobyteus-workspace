## Improvements

- Closing a Task now also stops the work it delegated to another node. When a Task is set to DONE or CANCELLED, an agent or agent team that was started for it on a paired node stops within seconds, including a team member in the middle of a turn, unless the same run still has another open Task. It then leaves that node's run list, on desktop and phone, and stays visible, offline, on the Task's page.
- If the other node is offline when the Task closes, the stop is sent as soon as it can be reached again, also after either node restarts.
- A closed cross-node Task can be continued as on one node: when the assigner reopens the Task and messages the run, the run continues with its conversation and appears again.

## What you need to do

- Update every paired node to this version together. A node on an older version keeps running work whose Task was closed on another node, until both are updated.
