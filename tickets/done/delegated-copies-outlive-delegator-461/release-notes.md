## Improvements

- Delegated work keeps going when you stop the run that started it. An agent, team or org that was given a Task now runs on its own: stopping the run that delegated it no longer stops it, and its report wakes the stopped run when it arrives. This also holds for work delegated to another node.
- Every run's status is its own. A Team row is no longer shown as busy because of the runs it delegated, and each delegated run shows its own status.
- Delegated runs are listed under the member that delegated them, and a delegated run has one name everywhere: the slot it was delegated to.
- A delegated Team's row opens its coordinator in every view; only the arrow folds and unfolds its members.
- When you change a run's runtime, its notice now appears live at the place it is kept in the conversation.
- A run cannot be archived or deleted while a run it delegated is still working, on this node or on another; the reason is shown. Once that work has stopped, it can be.
- After a restart, delegated runs come back offline with their conversations and continue with their next message; a run that was busy when an update restarted the app resumes on its own.

## Upgrade Notes

- On first start, the app converts how delegated runs are stored, once, so that each is a run of its own. Conversations, Tasks and files are kept.

## What you need to do

- Update every paired node to this version together: nodes on different versions cannot reach each other's delegated runs.
- After updating, do not go back to an older version on the same data: an older build cannot read the converted runs. If you need to go back, contact support instead of installing an older build.
