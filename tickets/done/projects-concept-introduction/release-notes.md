# Release Notes — Projects (preview, off by default)

## What's new

- **Projects (preview).** A new top-level **Projects** module lets you group related workspaces. A Project has a unique name, an optional description, and a list of linked workspaces. Each link has its own description.
  - Create, rename, describe, and delete Projects. Deleting a Project removes only the Project and its links; it never touches your workspaces or files.
  - Link an existing registered workspace, or enter (or, in the desktop app, browse to) a new folder, which is registered and then linked in one step.
  - If a linked workspace is removed from Workspaces, the Project keeps the link and marks it **Unavailable**. Registering the same folder again makes it available again. Removing a workspace is never blocked by Projects.
  - Search Projects by name or description. English and Simplified Chinese are supported.
- **Turn it on per node** in Settings → Server Settings → Basics → **Projects**, or with the `ENABLE_PROJECTS` server setting. It is off by default. Turning it off hides Projects without deleting any data. Projects are not shown in the mobile app.

## Improvements

- The searchable pickers (for example the Existing workspace picker) can now be used fully from the keyboard: arrow keys, Home/End, Enter to choose, and Escape/Tab to close. Inside a dialog, Escape closes only the picker, not the dialog.

## Compatibility

- No migration. Existing Applications and Skill Improvement settings keep their values and behave as before. Projects data is stored per node in `<app data>/projects/projects.json`, which is created on first use.
