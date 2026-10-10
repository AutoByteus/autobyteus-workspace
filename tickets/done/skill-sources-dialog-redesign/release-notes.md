# Release Notes — skill-sources-dialog-redesign

## Improved

- The **Manage Skill Sources** dialog (Skills → Sources) has a new, compact design.
  - Each source is one row with an icon, a short name (`owner/repo` for GitHub, the folder name for a folder), its skill count and the full path or URL. A copy button copies the path or URL.
  - Only the list scrolls, so the add area stays visible even with many sources.
- One **Add skill source** box now takes a folder path or a GitHub repository URL. A URL is imported from GitHub; anything else is added as a folder.
- In the desktop app, **Browse…** opens the folder picker and fills in the path. Nothing is added until you press **Add**.
- GitHub sources are checked automatically when the dialog opens.
  - **Update** appears only when an update is available or a previous update failed. The versions are shown in the confirmation.
  - **Try again** appears only when a check failed.
- Sources are removed with a trash button, after confirmation. The Default source can't be removed.
- Keyboard use: focus stays inside the dialog, Tab cycles through its controls and Esc closes it.

## Internal

- Test-only change: the GitHub skill runtime test harness (`autobyteus-server-ts/tests/e2e/skills/github-skill-runtime-harness.ts`) was updated to the current runtime preparation API. Its assertions are unchanged, and no product behavior changes.
