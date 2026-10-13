# Release Notes — Agent And Team Defaults Apply Everywhere

Status: the first round shipped in beta `v1.5.3-beta.1`. These notes, including the reopened round's fixes, are for the next release; the user decides the release at finalization.

## What's New
- **Agent and team defaults now apply when an agent delegates.** When an agent hands work to a copy of an agent or team, or brings one in as a collaborator, each agent in it runs on its own default runtime and model. A team member without its own default uses its team's default. Only when nothing usable is set does it use the runtime and model of the run that started it. For example, set Codex as the default of two members of a team, and those two run on Codex when the team is delegated, while the rest use the delegating run's settings.
- **Team and Org launches start from each member's default.** Starting a team or an Org fills in each member with its own default. This covers New chat, switching to a team or an Org with the heading switcher, mobile run setup, and an Org's launch page. Copying a run's settings with **+** keeps that run's member settings instead. Changing the main model no longer overrides these members. You can still change any member, or reset it to follow the main settings, before you start.
- **See what each delegated agent runs on.** A run's Settings now lists its collaborators and delegated copies below Members, in the same layout. Each starts collapsed and shows how many notes it has. Open one to see its settings and each of its agents, with the coordinator marked. Every agent shows the runtime and model in use and where it came from (agent default, team default, or inherited from the run). This list is read-only.

## Notes
- If a configured default cannot be used (the runtime is not available, the model is not offered, its settings are invalid, or the default is incomplete), the agent still starts on the next available setting. A note says which agent was affected, what was configured, why it was skipped and what it runs on. The note appears in the delegation result and in Settings. In a launch form, the member's row shows the note and follows the main settings.
- Copies and collaborators keep the settings they started with. Editing a default later affects only copies started afterwards.
- Runs from earlier versions open and resume as before. Their delegated agents show "Source not recorded".
- Delegating to a member that is already part of the run still uses that member's own settings.
- A runtime that is installed but not signed in can still be chosen. The agent then fails at its first message rather than falling back.
- For a saved team or Org run, a copy started while its Settings are open appears after you refresh.
