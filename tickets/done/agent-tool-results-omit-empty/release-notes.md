# Release Notes — Project Task titles, shorter agent tool results

Planned for the next beta. Beta tags publish GitHub-generated notes; this file is the curated, user-facing summary for the stable release that includes this change.

## What's New
- Project Tasks have a title. You enter it when you create a Task, edit it on the Task page, and see it on board cards, in pickers, on the Task page and in the Workspaces tree. Agents give a title when they create a Task and can change it.
- Agents can read one Project Task in full with the new opt-in tool `get_project_task`. An agent working on a Task is told the Task's key and Project in its first message, and it can read only that Task.

## Improvements
- Agent tool results are smaller. Every built-in agent tool leaves out empty fields and returns compact JSON, on every runtime.
- `list_project_tasks` returns short entries (key, title, status and relations) instead of every full description. For a Project with about 150 open Tasks, the list is over 90% smaller (about 480 KB before, about 31–33 KB now). Agents read a Task in full with `get_project_task`.
- `search_project_tasks` returns each match's title. It reports meaning search only when meaning search could not be used.
- `list_available_agent_runtimes` leaves out a usage limit's remaining percentage, reset time or blocked-until time when it is not known. Settings → Model Routing is unchanged.
- The Project Task Manager agent package has been updated to match: it uses titles, short lists and `get_project_task`.

## Upgrade Notes
- On first start, existing Project Tasks get a title from the first line of their description (cut to 200 characters with "…"). Nothing else in the Task changes. You can rename any title afterwards.
- **Rolling back to an earlier version is not supported after this upgrade.** An older version drops the title the next time it saves a Task. If you need to go back, contact support instead of installing an older version.
- Tasks with no Project (Temp tasks) have no title; they keep showing their description's first line.
