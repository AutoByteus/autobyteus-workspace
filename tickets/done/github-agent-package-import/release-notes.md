# Release Notes

## What's New

- You can now import agent packages directly from a public GitHub repository URL in `Settings -> Agent Packages`.

## Improvements

- The settings surface is now named `Agent Packages` instead of `Agent Package Roots`.
- GitHub imports are downloaded into app-managed storage automatically, so users do not need to clone repositories manually.
- Imported GitHub packages are registered through the same package list as local package paths.

## Fixes

- Removing a GitHub-imported package now deletes the managed local copy from app storage instead of leaving stale downloaded data behind.
