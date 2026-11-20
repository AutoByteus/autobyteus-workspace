## A Grok agent's own follow-up turn is now shown

- When a background command of a Grok agent ends, Grok wakes itself and works on the result. Before, that turn was invisible in AutoByteus: you saw no output and no tool calls, the run read as idle while Grok was working, and the usage was not counted in the run. Now the run shows it like any turn: a notice of what woke the agent (for example "Background task … completed (exit code: 0)"), then its reasoning, text and tool calls, and then its end.
- While that turn runs, the run reads as busy. A message you send meanwhile is held and sent when the turn ends, and the Stop button cancels the turn.
- The notice is kept in the run's history, so it is still there after you reload the run.
- This replaces the earlier note that a Grok agent was not woken when its background command ended: it was woken, but AutoByteus did not show it.
