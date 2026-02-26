# UI Behavior Test Matrix

| transition_id | flow | screen | trigger | from_state | to_state | expected next state image | acceptance check | open question / risk |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| th_workspace_boot_to_list_ready | workspace-task-history | workspace-task-history | App opens to workspace | bootstrapping | list-ready | `images/web/workspace-task-history/workspace-task-history-default.png` | Task list is visible immediately with summaries and recency labels; no empty "no agents running" state | Should first row auto-select last opened task or most recently updated task? |
| th_click_task_to_restore_indicator | workspace-task-history | workspace-task-history | Click task row with inactive runtime | list-ready | restoring-task | `images/web/workspace-task-history/workspace-task-history-default.png` | Main pane header shows restoring indicator while keeping task context visible; no modal interruption | Should restore be cancelable from header when restore takes > 3 seconds? |
