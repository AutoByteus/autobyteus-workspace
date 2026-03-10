## Improvements
- Improved agent runtime support so configured agent skills are now available in Codex and Claude runs, not only the native AutoByteus runtime.
- Improved Codex skill loading by automatically mirroring the selected agent skills into the workspace-local `.codex/skills` folder for the duration of the run.

## Fixes
- Fixed stopping Codex and Claude runs so termination now follows the correct runtime-specific path instead of attempting native-agent cleanup first.
- Fixed temporary Codex skill bundle cleanup so AutoByteus removes the workspace-local mirrored skill copy after the run ends and refreshes stale mirrored copies on restore.
