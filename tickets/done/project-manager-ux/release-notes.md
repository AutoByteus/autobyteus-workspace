# Release Notes — Live Projects pages, Task workers and Temp tasks

## Changed

- **Projects pages update live.** The Projects list, the Task board and the Task page change as soon as an agent or you change a Project or Task; no Refresh is needed. New and moved Tasks are briefly highlighted.
- **Each delegated Task shows who it was handed to.**
  - The Task row and the Task page show the agent or team that has the work, with its live status: Running, Initializing, Idle, Error or Offline. They show "Couldn't start" if the worker never started.
  - Click it to open that worker's conversation, including a team's coordinator and workers hosted by a Team or Org run.
  - After DONE, the worker shows Offline and can't be opened until it is reactivated.
- **Temp tasks.** Work an agent delegated without a Project now has its own place. A "Temp tasks" button on the Projects page shows how many are open. It opens a read-only board (Open / Done) and Task pages, also live.
- **Left-panel task rows always open.** Clicking a delegated worker's row in the left panel now opens its conversation from any page, including from Projects while its run is already selected.

## Upgrade notes

- No data migration. Existing Tasks show their worker by kind ("Agent" or "Team"). New delegations also record the worker's address and show its name.
- Projects remain behind the existing Projects setting (off by default).
- If you roll back to an older version, worker names recorded by this version are no longer shown. The data stays readable.
