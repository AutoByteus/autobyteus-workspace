# Skills come only from the agent definition

## Changes
- **No run-level skill setting.** A run always gets the skills configured on its agent definition (and, in a team, each member gets the skills of its own agent definition). The old per-run "skill access" value is gone from the app, the server API, the application SDK and the stream contracts.
- **Old run history still opens.** Runs saved with the old value load normally; the value is ignored. Nothing is migrated.
- **Daily Assistant can read files.** Its built-in definition now includes the `read_file` tool.
- **Built-in agents are reset on every server start.** Every built-in agent, including Daily Assistant, is replaced from its shipped template at startup. Edits you save to a built-in agent do not survive a restart. To keep a customized version, create a new shared agent with your changes.

## Compatibility
- The desktop/web client and the server must be the same version. A client from an older version that still sends the removed setting is rejected by a newer server.
- Custom applications built against an older application SDK that pass `skillAccessMode` in a launch must remove it and rebuild against the new SDK.
