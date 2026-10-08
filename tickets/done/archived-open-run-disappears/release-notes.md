# Release Notes — Archiving or Deleting the Open Run Closes It

Status: prepared before user verification. Whether this ships in a release, and with which version, is decided at finalization.

## Fixed
- Archiving the agent run that is open in Chat now closes it, shows the workspace empty view, and removes its row. Before this fix the run stayed open and came back in the sidebar as a `local` row, also after a window reload, so the archive looked like it had failed. This applies to the row Archive and to the group **Archive all runs**.
- Archiving an open team run (team view or member view) no longer jumps to another loaded team. It closes to the workspace empty view.
- Deleting an open agent or team run closes to the workspace empty view as well, with no "chat not found" page and no jump to another loaded run.
- Opening an old address of an archived run (window reload, browser Back, an old link) shows the workspace empty view and does not bring the run back.

## Unchanged
- Agent Org runs already closed to the workspace empty view and still do.
- Archiving or deleting a run that is not open leaves the open run as it is.
- Running runs still cannot be archived or deleted. Group Archive all still says "Stop running runs first."
- A failed Archive or Delete keeps the run open and listed and shows the error toast as before.
- Discarding an unsent New chat draft still returns to New chat.
- A deleted run's old address still shows "chat not found".

## Notes
- Client-only change. No server API, settings, data migration or reset.
