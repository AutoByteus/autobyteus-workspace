# Release Notes — Edit Imported Teams And Orgs

## Fixes
- **Imported teams and organizations can be edited and saved.** Teams and organizations from an agent package you added (a local folder or a GitHub install) can now be changed and saved in the app, like that package's agents. This includes their default runtime and model. Before, saving failed with a "read-only" error. The changes are written into the package folder, so everyone using that package gets them, and new runs and delegated copies use the saved default.

## Notes
- Saving keeps the package's relative links as they are.
- The first save of an older package file may also tidy its formatting, so your package checkout shows a one-time change.
- Edits to a package installed from GitHub are replaced by the next update of that package, as for agents.
- If the package folder cannot be written on disk, the save still fails with a "read-only at source path" message.
