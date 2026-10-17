# Release Notes — delegated-team-aggregate-status

## Improved

- Every Team in the Workspaces tree now shows the same status dot before its icon, with the same colours as agents:
  - **blue (pulsing)** when any agent in the Team is working or starting;
  - **red** when none is working and one has an error;
  - **green** when the Team is idle;
  - **gray** when every agent is offline or the run is stopped.
- Teams that an agent delegated work to (for example under the Project Task Manager) now show this status. They used to show none. The dot stays visible when the Team is collapsed.
- A Team run under **Teams** is no longer blue just because it is running. It is blue only while one of its agents is working, and green when they are idle. The Team's group row shows the highest status among its runs.
