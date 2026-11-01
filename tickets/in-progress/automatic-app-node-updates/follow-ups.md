# Follow-ups — automatic-app-node-updates (autobyteus-356)

| ID | Problem | Why not here | State |
| --- | --- | --- | --- |
| FU-001 | Node server update outcomes show only on the node's Nodes-page row, not as Notification Center rows | Would add a new row kind; the Task's goal (nodes follow automatically) is met without it | Open |
| FU-002 | A Docker node with no desktop running never updates by itself (DEC-003 A) | Updating from a channel on the node could move it ahead of the desktop (DESIGN rule 9) | Open |
| FU-003 | Runs busy at an automatic install that fails in the same process are stopped by the recovery relaunch and not resumed (285 resumes only after a version change) | Rare; the failure row tells the user; resuming after a plain relaunch is 285's rule, not this ticket's | Open |
