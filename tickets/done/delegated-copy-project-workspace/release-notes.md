# Release Notes — Delegated agents work in their Task's Project folder

## Changed

- **Delegated agents now work in the Project's folder.** When an agent hands a
  Task of a Project to another agent or team, the new agent (and every member of
  a new team) works in the Project's first linked folder, even when the agent
  that handed it out works in another folder. Focus the delegated agent to see
  that folder in Files and Terminal. Tasks of a Project with no linked folder,
  and work without a Project, run in the same folder as before.
- **A missing Project folder is reported.** If a Project's first linked folder
  no longer exists on this computer or node, the delegation stops with a message
  naming the Project and the folder, and nothing is started. Fix the Project's
  link, or link another folder, then delegate again.
- Agents already working keep their folder.
- The first time work is delegated into a Project folder that is not yet in your
  Workspaces list, that folder appears there as a new workspace.

## Rolling back

Rolling back to an earlier version is possible. No stored data changes shape;
agents started by this version keep the folder they were started in.
