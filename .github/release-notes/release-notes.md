## What's New
- **Edit imported Teams and Organizations.** Teams and Organizations from an agent package you added, a local folder or a GitHub install, can now be changed and saved in the app, like that package's Agents. This includes their default runtime and model. Before, saving failed with a "read-only" error. The changes are written into the package folder, and new runs and delegated copies use the saved default.
- **Precise output speed in the Token Meter.** The TPS card now shows how fast the selected agent's latest model call produced output, with the model it used. The server times each call itself, so a turn with a single model call gets a reading. Tool runs and approval waits are no longer counted. It works for standalone Agents, Team and Org members, and delegated copies.

## Improvements
- **Clear measurement method.** When the runtime shows when output starts, the reading is generation speed. Otherwise it is end-to-end call speed, labeled "incl. time to first token". "How TPS is measured" explains each reading, in English and Simplified Chinese.
- Very short model calls are skipped and leave the last TPS value in place. TPS is not kept after a reload.

## Notes
- Saving an imported Team or Organization keeps the package's relative links as they are. The first save of an older package file may also tidy its formatting, so your package checkout shows a one-time change.
- Edits to a package installed from GitHub are replaced by the next update of that package, as for Agents.
- If the package folder cannot be written on disk, the save still fails with a "read-only at source path" message.
