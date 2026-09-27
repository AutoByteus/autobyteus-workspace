# AutoByteus v1.4.90 — Grok Build runtime

## What's New
- **Grok Build is a new agent runtime.** Grok Build is xAI's agent. It runs through the `grok` CLI (version 1.0.41 or later) installed on your machine and uses your own Grok sign-in.
  - **Where to find it:** "Grok Build" is available for standalone agents, team members and org members.
  - **Models:** the model list and reasoning effort come from your Grok account, for example `grok-4.7` with `xhigh`, `high`, `medium` or `low`.
  - **Conversations:** runs show reasoning, replies and tool cards as they happen. You can interrupt a turn, and stop and reopen a run to continue in the same Grok session.
  - **Teams:** Grok team members can use AutoByteus team tools such as `send_message_to`.
  - **Skills:** configured skills are available to Grok.
- **Tool approvals:** when auto-approve is off, every approval request Grok raises appears in AutoByteus. Grok decides which actions need approval. If you deny a tool, Grok ends its turn and the turn is shown as completed.
- **Token usage:** usage and estimated cost are recorded for each model call and shown as "Grok Build" in usage analytics.

## Improvements
- **Built-in Grok model:** the built-in AutoByteus runtime now offers `grok-4.7` in place of `grok-4.6`. It has a 500k context window, tiered pricing and a reasoning-effort setting. If you saved a `grok-4.6` selection, select a model again.
- **Availability and errors:** if `grok` is not installed or is too old, Grok Build shows as unavailable with a clear reason. Set `GROK_BUILD_COMMAND` to use a different command. Grok sign-in and rate-limit errors are shown as Grok reports them.
- **Your Grok configuration is left alone:** AutoByteus never changes it. For AutoByteus runs, Grok's own subagents, workflows and question prompts are turned off, because AutoByteus delegation and messaging are used instead.

## Known limitations
- **Application launches:** launching applications on Grok Build, as with Antigravity CLI, is not supported yet.
- **Reopen errors:** if reopening a Grok run fails, you see the general restore error. Grok's own error text is kept as the underlying cause.
