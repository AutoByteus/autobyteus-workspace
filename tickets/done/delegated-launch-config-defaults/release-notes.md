# Release Notes — Agent And Team Defaults Apply Everywhere

Status: prepared before user verification. Whether this ships in a release, and with which version, is decided at finalization.

## What's New
- **Agent and team defaults now apply when an agent delegates.** When an agent hands work to a copy of an agent or team, or brings one in as a collaborator, each agent in it runs on its own default runtime and model. A team member without its own default uses its team's default. Only when nothing usable is set does it use the runtime and model of the run that started it. For example, set Codex as the default of two members of a team, and those two run on Codex when the team is delegated, while the rest use the delegating run's settings.
- **Team and Org launches start from each member's default.** Starting a team from New chat, from mobile run setup, or an Org from its launch page now fills in each member with its own default. Changing the main model no longer overrides these members. You can still change any member, or reset it to follow the main settings, before you start.
- **See what each delegated agent runs on.** A run's Settings now lists its collaborators and delegated copies, and each of their agents, with the runtime and model in use and where it came from (agent default, team default, or inherited from the run). This list is read-only.

## Notes
- If a configured default cannot be used (the runtime is not available, the model is not offered, its settings are invalid, or the default is incomplete), the agent still starts on the next available setting. A note says which agent was affected, what was configured, why it was skipped and what it runs on. The note appears in the delegation result and in Settings. In a launch form, the member's row shows the note and follows the main settings.
- Copies and collaborators keep the settings they started with. Editing a default later affects only copies started afterwards.
- Runs from earlier versions open and resume as before. Their delegated agents show "Source not recorded".
- Delegating to a member that is already part of the run still uses that member's own settings.
- A runtime that is installed but not signed in can still be chosen. The agent then fails at its first message rather than falling back.
- For a saved team or Org run, a copy started while its Settings are open appears after you refresh.
