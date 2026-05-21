# Release Notes

## What's New

- Added source-aware Agent Packages management in Settings with local package reload and managed GitHub package check/update actions.
- Managed GitHub agent packages can now update from the repository default-branch archive without requiring a system `git` binary.

## Improvements

- Agent package rows now show package counts, source ownership, and update state such as unknown installed version, up to date, update available, check failed, or update failed.
- Local package reload and managed GitHub updates refresh dependent Applications, Agents, and Agent Teams in the same session.
- Duplicate GitHub import attempts now direct users to the existing package row's check/update flow.

## Guidance And Safety

- Private GitHub repositories should be cloned or synced locally, then imported as local paths and reloaded after external updates.
- Failed GitHub update checks or updates preserve the existing installed package and show recorded failure details.
