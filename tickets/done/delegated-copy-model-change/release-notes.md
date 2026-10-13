# Release Notes — Stop A Delegated Copy And Change Its Model

Status: finalized into `personal` without a release (none requested). These notes are for the next release that includes this change.

## What's New
- **Stop one delegated copy without stopping the run.** A copy of an agent or team that another agent started, or a collaborator it brought in, now has its own stop button while it runs. The button is on its row in the sidebar and in the run's Settings. Stopping it also stops the copies it started. The rest of the run keeps working.
- **Change a delegated copy's model.** While a copy is stopped, open the run's Settings to change the model and its settings for the copy, for its team, or for any of its members. Then save. The copy's next message, from you or from another agent, resumes it in the same conversation on the new model. The choice stays after it idles out, after the run is reopened and after an app restart.

## Notes
- The change applies only to that copy. Agent and team definitions, other copies, and copies started later are not affected.
- Changing a team's model also moves the members that follow the team. Members with their own model keep it.
- A model that the runtime does not offer, invalid settings, or a smaller context window on the AutoByteus runtime are refused with a message, and nothing changes.
- If the copy is started again before you save, the save is refused. Stop it again, then save.
- Copies started by earlier versions before their starter was recorded cannot be stopped together with their starter.
