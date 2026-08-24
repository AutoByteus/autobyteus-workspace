# Release Notes — Reliable New-Workspace Team Launches

## Improvements

- New and Existing workspace choices now remain consistent between the visible Agent/Team run form and the workspace used at launch.
- Team runtime, model, reasoning, fast-mode, auto-approve, and member-setting edits preserve a previously entered New workspace path.
- Explicit workspace choices now take precedence over workspace lists that finish loading later.

## Fixes

- Fixed remote-node Team launches silently falling back to Temp Workspace after the user selected New, entered a path, and then changed another Team setting.
- New workspace launches now register the visible path first, apply its canonical workspace identity, and create the Team beneath that workspace.
- Blank or rejected New workspace input blocks the launch with an actionable error instead of using a hidden prior workspace.

## Operational Notes

- No persisted-data migration or rebuild is required; existing workspaces and Agent/Team history remain directly usable.
