## New

- Switching the agent runtime of a stopped agent now also works for the members of a Team, the agents of an Organization (direct agents and agents inside mounted Teams) and delegated copies. Open the stopped run's settings, choose another runtime and a model of it, and save. Nothing starts yet: each affected agent switches at its own next message, keeping its run, chat and history. The chat shows a marker where the runtime changed. Choosing the original runtime again before the message undoes the switch.
- Changing the runtime in a Team's default settings switches every linked member, each at its own first message, so a Team that is partly switched is normal. A Team's or Organization's own default launch is not switched.

## Notes

- A model-only change of a stopped agent works as before and writes no marker.
- For developers of API clients: the Team mutation `updateStoppedTeamRunModelConfigs` is replaced by `updateStoppedTeamRunSelections`, and the Team and Organization mutations take `selectionPatches`. `runtimeKind` is required on every Team, Organization and delegated setting. Clients of the old names stop working.
- Stored runs from earlier versions load unchanged; nothing is migrated.
