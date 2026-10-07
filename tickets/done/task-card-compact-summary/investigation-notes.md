# Investigation Notes

## Investigation Meta
- Package identifier: `task-card-compact-summary`
- Request: Task cards on the Projects boards show the entire description (user report via `/delivery_engineer`, 2026-10-07, on v1.4.96-beta.4)
- Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-card-compact-summary`, branch `codex/task-card-compact-summary`
- Base: `origin/personal@c1e4e3df19d796f05633d648a65e4156f0bda1c6` (fetched 2026-10-07); finalization target `origin/personal`
- Bootstrap: OK. Current SR: `SR-001` (Draft)
- Authorities read: `references/requirements-engineering.md` (2026-10-06)

## Initial Request
- The user, on their own data:
  - "the UI for tasks shows the complete content. It's really terrible."
  - "It shouldn't show the complete, because the image shows nicely. But then in my product data, it was like a complete content."
  - "I cannot imagine how can the user read it when there are more and more tasks."
- Screenshot: `evidence/temp-tasks-full-content-2026-10-07.png` (copied from `/tmp/autobyteus-feedback/`). It shows the Temp tasks board: one Open card fills the lane, and a Done card's bold first line plus its grey preview run to ~25 lines.

## Source Log
| Source | Finding |
| --- | --- |
| `autobyteus-web/components/projects/ProjectTaskRow.vue:16-17` | Card = summary (`taskSummary`, first non-empty line, bold) + preview (remaining lines joined, grey). Both are `<span class="block line-clamp-2 …">`. The intent was at most 2 + 2 lines. The row is shared by Project boards and the Temp tasks board. |
| `git log -S line-clamp-2` on that file | The clamp has been the intent since `560a51129` (2026-10-02, the Projects task board foundations), and was kept by `project-manager-ux` |
| Delivery evidence (compiled with the repo's Tailwind ^3.4.5) | `.line-clamp-2 {display:-webkit-box; -webkit-line-clamp:2; …}` is emitted before `.block {display:block}`. The later `display:block` wins, so the clamp is ignored and the full text renders. Root cause: conflicting utilities on the same element. |
| `grep "block line-clamp"` in components/pages | Only these 2 occurrences (both in ProjectTaskRow). Other clamps (e.g. Project description `line-clamp-2 whitespace-pre-line`) don't combine with `block`. |
| `utils/projects/taskSummary.ts` | Summary = first non-empty line. Agent-written descriptions are usually one long paragraph, so the summary is the whole brief and there is no preview. |
| `/Users/normy/autobyteus_org/autobyteus-web-design/components/projects/ProjectTaskRow.vue:16-17` | The approved design copy uses the same classes; its fixtures had short text, so the defect was invisible in VIS-001..018 |
| `autobyteus-web/docs/projects.md` ("first-nonempty-line board summaries"; "a description summary") | The documented intent is a summary on the board, not full text; the Task page shows the full description |
| Validation gap (delivery) | Reference screenshots, PMU probe fixtures and the desktop journey all used short text; jsdom cannot observe line clamping |

## Behaviors
| ID | Current | Evidence |
| --- | --- | --- |
| BEH-001 | Every board card (Project board and Temp tasks) renders its whole description | Screenshot; ProjectTaskRow |
| BEH-002 | Task page shows the full description | ProjectTaskDetail (unchanged) |
| BEH-003 | Search matches the full description | projects.md |

## Classification hint
- The display defect is a `Local Implementation Defect` against an existing approved intent (2-line clamps).
- Whether Tasks should also get short titles is a separate product question (tool contracts, data model): requirements decision DEC-001.

## Additional Findings (2026-10-07)
- `ProjectTaskRow.vue:13` uses `:aria-label="summary"`, so the full first line becomes the accessible name.
- `ProjectTaskDetail.vue:15` puts the delete confirmation text `deleteMessage {summary: taskSummary(task.description)}` through the full first line.
- `TempTaskDetail.vue` has no delete action (read-only).
- Search (`ProjectTaskBoard.vue:46`, `TempTaskBoard.vue:84`) matches the full description.
- `tests/e2e/project-manager-ux-probe.mjs` (`test:e2e:project-manager-ux`, PMU-001..012) is the rendered-browser probe of both boards; its fixtures use short text.
