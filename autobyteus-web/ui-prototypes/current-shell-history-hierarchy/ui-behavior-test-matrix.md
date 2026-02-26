# UI Behavior Test Matrix

| transition_id | flow | screen | trigger | from_state | to_state | expected next state image | acceptance check | open question / risk |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| csh_boot_left_panel_ready | agents-page-history-hierarchy | agents-page-history | Open `/agents` page | loading | shell-ready | `images/web/agents-page-history/agents-page-history-by-workspace-default.png` | Existing shell remains visually consistent; only lower-left history section contains hierarchy | Should empty history section still show a compact helper line when no history exists? |
| csh_expand_branch_show_10 | agents-page-history-hierarchy | agents-page-history | Expand a hierarchy branch | collapsed | expanded | `images/web/agents-page-history/agents-page-history-by-workspace-default.png` | Exactly up to 10 recent task rows are visible with title + relative time | Should "View more" open a modal, route, or lazy-load inline? |
| csh_select_task_resume_context | agents-page-history-hierarchy | agents-page-history | Click a task summary row | list-ready | selected-task | `images/web/agents-page-history/agents-page-history-by-workspace-default.png` | Selected row highlight is clear and action semantics imply "resume/continue" | Should selection auto-navigate to `/workspace` immediately or stay on `/agents` until explicit run? |
