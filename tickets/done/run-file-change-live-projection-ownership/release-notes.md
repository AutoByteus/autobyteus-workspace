# Release Notes — Agent Artifacts stay previewable during a run

## Fixed

- **Every artifact an active run produces can now be opened.** Before this fix, after the first artifact was viewed, later files from the same run could show as "deleted or moved" until the server restarted. This affected multiple images, for example. Now every file the run records stays listable and previewable while the run is active, after it ends, and after a restored run starts a new turn. This works for standalone Agents and for Team members.
