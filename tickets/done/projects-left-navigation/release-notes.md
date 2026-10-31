# Release Notes — Projects in the left panel

## What's new

- **See your runs by Project.** The left panel's run section now has a
  **Workspaces | Projects** switch. In Projects mode, each Project lists the
  agent, team and org runs started for it and every run working on its Tasks,
  with the delegated work under each run limited to that Project. The app
  remembers your choice.
- **Start a run under a Project.** Use **+** on a Project (or on one of its agent
  or team groups), or pick the Project in New chat's workspace chip. The run
  starts in the Project's first linked folder (or the temp workspace when the
  Project has none, or the folder you picked), knows which Project it works
  for, and appears under the Project right away.
- **Older runs are included.** Runs that already worked on a Project's Tasks
  appear under that Project. A run that worked on several Projects appears
  under each.
- **Stays current.** Delegated work, finished Tasks, stopped runs and archived
  runs update the Projects view as they happen, and it catches up after the
  server reconnects.
- **Projects have a briefcase icon** in the navigation, on Project cards and in
  the Projects tab.

## Good to know

- Workspaces mode is unchanged. A run under a Project is still listed under its
  folder in Workspaces.
- A Project lists every run hosting its open work, even runs older than the six
  newest that Workspaces shows per agent.

## Rolling back

Rolling back to an earlier version is possible. This release adds a new file
per Project that earlier versions do not read, and it changes no existing run
or history data. After rolling back, runs started under a Project are still
listed in Workspaces as before.
