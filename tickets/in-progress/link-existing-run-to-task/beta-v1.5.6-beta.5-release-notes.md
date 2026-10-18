> **Beta.** Offered only to desktop installs with **Settings > Updates > Receive beta updates** turned on.

## What's New
- **Give a Task to a run you already started.** The Project Task Manager (or any agent that delegates Project Tasks) can now give a saved Task to an idle agent or team run you started yourself in the same workspace: `delegate_task` with that run's run id and the Task. The run continues its own conversation with the Task as its next work. All its files and messages are kept.
- From then on the run belongs to the Task, like any task agent: it shows under the delegating agent with its Task line (and leaves its own sidebar group), it is woken and coordinated by that agent, it is stopped and removed from the sidebar when the Task is DONE or CANCELLED, and the delegating agent can continue it after the Task is reopened.

## Improvements
- A run that can't be adopted is refused with the reason, and nothing changes. The reasons are: another workspace; already owned by a Task or part of another run; busy with a turn (try again when it is idle); an organization run or a team member; a closed or temporary Task; a delegating agent that is itself a task agent; an application run; an archived run; or a run whose definition is no longer available.

## Notes
- The delegating agent's Token Meter includes the adopted run's usage from before it was adopted.
- Members of an adopted team may at first use their old addresses; the refusal text tells them the right ones.
