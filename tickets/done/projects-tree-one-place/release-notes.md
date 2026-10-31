# Release Notes — Projects show each run in one place

## Changed

- **A Project lists exactly the runs started under it.** In the left panel's
  Projects mode, a run appears only under the Project you started it in, with
  all of its delegated work beneath it. A run started in a workspace, for
  example a Project Task Manager that hands out Tasks of several Projects, is no
  longer repeated under each of those Projects; it stays in Workspaces with its
  delegated work.
- Projects with no runs started under them show "No runs yet", with **+** to
  start one.
- Agent groups in a Project show the six newest runs, as in Workspaces.
- Agent Org runs are not listed in Projects mode; they stay in Workspaces.

This replaces the earlier behavior of listing every run that worked on a
Project's Tasks under that Project.

## Rolling back

Rolling back to an earlier version is possible. This release changes no stored
data; it only changes what Projects mode lists.
