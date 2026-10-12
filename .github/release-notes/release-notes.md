## New
- **Auto-compaction marker in the Token Meter.** When a runtime reports its auto-compaction threshold, the context bar shows a marker and "Auto-compacts at …". This covers the Claude Agent SDK, and the native runtime with automatic compaction.
- **Over-window state.** When a runtime's own reading is larger than its context window, the Token Meter shows the true percentage and marks it "Over the runtime's window".

## Changed
- **Compaction uses the agent's own model.** When an agent on the AutoByteus runtime compacts its memory, the same model that is working on the conversation summarizes it.
  - With Anthropic (Claude) and DeepSeek models, the summary request reuses the conversation that is already cached and summarizes the full conversation.
  - Summaries have a fixed nine-section format: task, requests, decisions, unverified points, files changed, completed work, current state, next steps and references. This makes it easier for the agent to continue where it left off.
  - Summary requests get enough room to finish, even when the agent's output limit is set low.
  - Gemini and other models keep the transcript-based summary, now on the agent's own model.
- The separate **compaction model** setting is removed. A value saved earlier is ignored and can be deleted from Server Settings.
- **The remote AutoByteus model provider is removed** because its server no longer exists.
  - Settings no longer lists an "AutoByteus" provider or an "AutoByteus LLM Hosts" card.
  - Model pickers no longer offer remote AutoByteus LLM, image or audio models.
  - The **AutoByteus agent runtime** is not affected and works with every other provider. The "AutoByteus VNC Hosts" setting is not affected either.
- **Token Meter after a compaction.** On the native runtime and the Claude Agent SDK, the new context size arrives with the next model call. Until then the meter keeps the previous value, greyed, with "Compacted — updates on the next model call".
- Compaction calls, including a native compaction's own summary call, now appear in the Token Meter with their tokens and cost.
- In usage reports, the count now means model calls.

## Fixes
- **A Claude agent's normal reply is no longer shown as a red "authentication failed" error** when the reply mentions being "not logged in" or asks to "run /login". The reply appears as a normal message and the run returns to Idle. A Claude runtime that really is not logged in still reports the authentication error.
- **Claude Agent SDK: the Token Meter's latest prompt is correct.** It shows the SDK's own count of tokens in context for the latest model call, against the SDK's window. Before, it could add up every call of a turn and show several hundred percent.
- **Claude Agent SDK: the Token Meter updates during the turn.** It updates on every model call, including for team members and delegated copies. The SDK's own compaction calls are counted, and no call is counted twice.
- **Antigravity (AGY): usage arrives during the turn,** one update per model call. Cache reads count toward input, and the latest prompt is shown with "context limit unavailable".
- **Codex:** after a compaction, the Token Meter shows the post-compaction context size instead of 0.
- **Grok Build:** the Token Meter's latest prompt is now shown.
- Gemini requests now take their system prompt from the request itself.

## Notes
- **A database migration runs once on upgrade.** It clears stored Claude Agent SDK latest-prompt readings, which cannot be recomputed. Totals and costs are unchanged. Antigravity (AGY) runs recorded before this release keep their stored totals.
- An agent, run, launch profile or media default that still names a remote AutoByteus model shows that model as unavailable. It does not start until you choose another model.
  - The saved value is not changed.
  - A stopped run whose model is no longer offered cannot switch models; start a new run instead.
- A leftover `AUTOBYTEUS_LLM_SERVER_HOSTS` value appears under Server Settings as an ordinary custom setting that you can delete. A saved AutoByteus API key is ignored.
