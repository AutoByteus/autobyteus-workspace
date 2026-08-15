## What's New
- Personal desktop releases now use deterministic flavor and platform-target selection across the release workflow.

## Improvements
- macOS Apple Silicon and Linux release jobs explicitly resolve their target architectures and publish matching updater metadata and artifacts.
- Desktop release documentation now matches the current GitHub Actions workflow and publication path.

## Fixes
- macOS CI prepares the Python setuptools dependency required by the Electron native-module rebuild path.
- Local macOS packaging supports unsigned, non-notarized output when Apple credentials are unavailable.
