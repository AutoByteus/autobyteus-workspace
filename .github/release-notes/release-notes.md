## Added
- **Cancelled Task status.** A Task that is no longer needed can be marked Cancelled instead of Done. Agents cancel or reopen it with `create_or_update_task`, and cancelling stops the Task's delegated agents and teams just as Done does. Cancelled Tasks are hidden on the Project board and in Temp tasks until you click **Cancelled (N)**.
- **Follow-up Tasks can go to the same delegated copy.** After Task A is Done or Cancelled, the agent that assigned it can give Task B to the same team or agent copy by its ID. The copy resumes with its conversation. A busy copy is refused with a reason.
- **Delegated agents can reach the agent that delegated them.** Members of a delegated team, or a delegated agent, can `@` mention and message the run's own agent, such as the Project Task Manager. The message arrives in that agent's existing conversation.
- **Prompt caching for Anthropic models on the AutoByteus runtime** (for example Claude Opus 5.5). In validation, about 95% of input tokens were read from cache, where before nothing was. The Token Meter prices cache reads and writes separately, so its cost matches Anthropic's charge.

## Improvements
- Delegated teams start only their coordinator. Other members stay Offline and use no runtime until work reaches them. If a member cannot start, the sender gets a clear "could not start" result naming the cause.
- A delegated agent or team with a background task still running is no longer shut down when it goes idle. The task can finish and its result is reported back.
- Claude keeps its earlier reasoning across new messages. The interrupt note after Stop is added at the end of the conversation, so the cache stays valid.
- The Context Files tray shows an error naming the file when attaching or removing fails. A failed removal keeps the file so you can retry.
- Where an agent can't accept uploads, `+` is disabled with the reason, and pasting or dropping a file shows a message. File paths can still be attached.

## Fixes
- Attached files can be removed (× and Clear All) in a delegated agent or delegated team member, for example under the Project Task Manager. The uploaded copy is deleted too.
- Images and other files attached to a message for an Antigravity (AGY) agent now reach the agent.
- After you stop an agent mid-turn, the next message is accepted in the same conversation. Before, it failed with "still owns retired cleanup" until an app restart. A standalone agent whose runtime stopped on its own also restarts on your next message.
- Archiving or deleting the open agent or team run closes it to the workspace empty view. It no longer reappears in the sidebar or jumps to another run.
- The Token Meter for AGY runs counts cache reads correctly, so the hit rate is no longer inflated to about 99%.
- Prices for Gemini 3.1 Pro Preview and Claude Sonnet 5 now match the official prices for new usage.

## Changed
- Send needs typed text or a skill tag. A message with only attached files can no longer be sent; this now works the same in every message box.
- For integrations: a Team result from `delegate_task` now returns `target_team_run_id` and `target_team_coordinator_agent_run_id` instead of `target_agent_run_id`. Update the imported `autobyteus-agents` package, which contains the Project Task Manager skill, together with this release.
- `@anthropic-ai/sdk` was upgraded to 0.132.1.

## Notes
- No reset or data migration is needed. Existing usage records keep their recorded prices.
- Downgrading is not recommended: an older version may not show Cancelled Tasks, and it treats a copy reused for a second Task as damaged.
