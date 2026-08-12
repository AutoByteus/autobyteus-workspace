## What's New
- Added a consistent Carpenter-authored agent foundation across native AutoByteus, Codex, and Claude runtimes.
- Added clear agent identity, workspace, Bash, file-operation, team-runtime, and configured-skill guidance to every new run.

## Improvements
- Improved configured skills so their guidance stays lazy and package-relative while runtime work remains anchored to the selected workspace.
- Improved team runs by automatically exposing validated messaging and delegation capabilities to team members.
- Improved provider consistency by projecting one server-owned instruction contract through each provider's native system-instruction channel.

## Fixes
- Removed legacy prompt-mutator and processor configuration paths that could produce inconsistent runtime instructions.
- Fixed current agent-definition persistence so retired prompt-processor state is no longer written while historical definitions remain readable.
