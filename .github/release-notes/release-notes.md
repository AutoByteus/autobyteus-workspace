## What's New
- **Readable Task keys.** Every Project Task now has a short, permanent key such as `autobyteus-42`, made from the Project name. Keys are never reused, and they stay the same when you rename the Project. Existing Tasks get their keys automatically the first time the app starts, numbered in the order they were created. The Task page shows the key with a copy button, and Task links use it (`…/tasks/autobyteus-42`). Older links still open the Task.
- **"Depends on" for Project Tasks.** In New task or Edit task, choose which Tasks of the same Project come first. A card shows **Blocked by <key>** while one of them is still open, or **Dependency cancelled** if one was cancelled. The Task page lists **Depends on** and **Required by**. Dependencies only inform: nothing stops work from starting.
- **Agents use Task keys.** Agents see and use the key as the Task ID, and they can set dependencies with `depends_on` on `create_task` and `update_task`. Older long Task IDs are still accepted.
- **Team status in the Workspaces tree.** Every Team row shows a status dot, with the same colours as agents. It is blue while an agent in the Team is working, red when one has an error, green when the Team is idle, and grey when it is stopped. Teams that an agent delegated work to now show it too.
- **Agents are told when a skill they use changes.** When a skill used by a running agent is edited on disk, the agent gets one notice, labelled **Skill updated**, asking it to re-read the skill. Idle agents are not woken; the notice arrives with their next message.
- **Separate tools to create and update Projects and Tasks.** `create_project` and `update_project` join `create_or_update_project`. `create_task` and `update_task` replace `create_or_update_task`. Each tool has one meaning, and an agent has it only when its definition selects it.

## Improvements
- **Cleaner board and tree.** Board cards and the Workspaces-tree Task summary no longer show the Task key, so each card starts with its summary. Keys stay where they help you refer to a Task: the Task page, dependency lists, the picker, badges and links.
- **One collaboration model.** Agents message others inside their run, and delegate to agents or teams outside it. Prompts and tool descriptions say this the same way on every runtime. An agent that tries to delegate to itself or a teammate is told to message instead.
- **Clearer collaboration wording.** Agents get instructions written for their role, with each rule stated once. They reply to a report only when it asks for a reply, which stops back-and-forth acknowledgement loops.
- **A run whose saved data can't be read** no longer affects the others. It is left out, or says its data can't be read, while everything else opens normally.

## Fixes
- **File Explorer editor:** finishing an earlier Save no longer overwrites what you typed after pressing Save.
- Agents that only delegate work are no longer told to close Tasks they have no tool for.

## Upgrade Notes
- **Update your agent definitions for the new tools.** `create_or_update_task` is removed. Agents that need Task tools must select `create_task` and/or `update_task`. `create_or_update_project` still works but is deprecated; select `create_project` and/or `update_project` instead. This includes the Project Task Manager package.
- **Task keys are added on first start.** The first start of this version adds keys to existing Projects and Tasks. Nothing else in them changes.
- **Teams inside task agent teams are no longer supported.** Runs saved by v1.4.53–v1.4.69 that put a team inside a task agent team are not shown, or report that their data can't be read. No file is changed or deleted.
- Runs that earlier versions recorded as collaborators are converted into ordinary delegated runs on first start. Reach them by run ID.
